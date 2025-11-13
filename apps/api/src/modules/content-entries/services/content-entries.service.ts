import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ContentTypesService } from '../../content-types/services/content-types.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  CreateContentEntryDto,
  UpdateContentEntryDto,
  ContentEntryQueryDto,
} from '../dto';

/**
 * ContentEntriesService - business logic dla Content Entries
 * AI Note: Zawsze filtruj po tenantId - multi-tenant isolation
 */
@Injectable()
export class ContentEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentTypesService: ContentTypesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ) {}

  /**
   * Get content type by slug with caching
   */
  private async getContentType(tenantId: string, slug: string) {
    const cacheKey = `ct:${tenantId}:${slug}`;
    const cached = await this.cache.get<{
      id: string;
      tenantId: string;
      slug: string;
      name: string;
      schema: Record<string, unknown>;
    }>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const contentType = await this.contentTypesService.getBySlug(tenantId, slug);

    // Optimized: Increased TTL for content types (they change infrequently)
    await this.cache.set(cacheKey, contentType, 600); // 10 minutes TTL (increased from 30 seconds)
    return contentType;
  }

  /**
   * Validate data against JSON Schema
   * Note: For full JSON Schema validation, install ajv: pnpm add ajv ajv-formats
   */
  private async validateDataAgainstSchema(
    schemaJson: Record<string, unknown>,
    data: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Data validation failed: invalid data');
    }

    // Basic validation - check required fields
    const schema = schemaJson as {
      type?: string;
      properties?: Record<string, any>;
      required?: string[];
    };

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new BadRequestException(
            `Data validation failed: required field '${field}' is missing`
          );
        }
      }
    }

    // Validate field types if properties are defined
    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        if (fieldName in data) {
          const value = data[fieldName];
          const fieldType = fieldSchema.type;

          if (fieldType === 'string' && typeof value !== 'string') {
            throw new BadRequestException(
              `Data validation failed: field '${fieldName}' must be a string`
            );
          }
          if (fieldType === 'number' && typeof value !== 'number') {
            throw new BadRequestException(
              `Data validation failed: field '${fieldName}' must be a number`
            );
          }
          if (fieldType === 'boolean' && typeof value !== 'boolean') {
            throw new BadRequestException(
              `Data validation failed: field '${fieldName}' must be a boolean`
            );
          }
          if (fieldType === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
            throw new BadRequestException(
              `Data validation failed: field '${fieldName}' must be an object`
            );
          }

          // Validate string constraints
          if (fieldType === 'string' && typeof value === 'string') {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
              throw new BadRequestException(
                `Data validation failed: field '${fieldName}' must be at least ${fieldSchema.minLength} characters`
              );
            }
            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
              throw new BadRequestException(
                `Data validation failed: field '${fieldName}' must be at most ${fieldSchema.maxLength} characters`
              );
            }
          }

          // Validate number constraints
          if (fieldType === 'number' && typeof value === 'number') {
            if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
              throw new BadRequestException(
                `Data validation failed: field '${fieldName}' must be at least ${fieldSchema.minimum}`
              );
            }
            if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
              throw new BadRequestException(
                `Data validation failed: field '${fieldName}' must be at most ${fieldSchema.maximum}`
              );
            }
          }
        }
      }
    }

    return data;
  }

  /**
   * Create a new content entry
   */
  async create(
    tenantId: string,
    contentTypeSlug: string,
    dto: CreateContentEntryDto
  ) {
    const contentType = await this.getContentType(tenantId, contentTypeSlug);
    const schema = contentType.schema as Record<string, unknown>;
    
    await this.validateDataAgainstSchema(schema, dto.data);

    return this.prisma.contentEntry.create({
      data: {
        tenantId,
        contentTypeId: contentType.id,
        data: dto.data,
        status: dto.status,
      },
    });
  }

  /**
   * List content entries with filtering, sorting, and pagination
   * Optimized: Uses PostgreSQL JSON operators for efficient filtering
   */
  async list(
    tenantId: string,
    contentTypeSlug: string,
    query: ContentEntryQueryDto
  ) {
    const contentType = await this.getContentType(tenantId, contentTypeSlug);
    const skip = (query.page - 1) * query.pageSize;

    // Validate filter fields exist in schema to prevent injection
    const schema = contentType.schema as {
      properties?: Record<string, any>;
    };
    const validFilterFields = schema.properties ? Object.keys(schema.properties) : [];

    // Build WHERE conditions for raw SQL
    const conditions: string[] = [
      `"tenantId" = $1`,
      `"contentTypeId" = $2`,
    ];
    const params: any[] = [tenantId, contentType.id];
    let paramIndex = 3;

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    // Build JSON filter conditions using PostgreSQL JSON operators
    if (query.filter && typeof query.filter === 'object') {
      for (const [field, value] of Object.entries(query.filter)) {
        // Validate field exists in schema to prevent injection
        if (!validFilterFields.includes(field)) {
          continue;
        }
        
        // Use PostgreSQL JSON operator: data->>'field' = 'value'
        // For different types, we need to handle them appropriately
        if (typeof value === 'string') {
          conditions.push(`data->>'${field.replace(/'/g, "''")}' = $${paramIndex}`);
          params.push(value);
        } else if (typeof value === 'number') {
          conditions.push(`(data->>'${field.replace(/'/g, "''")}')::numeric = $${paramIndex}`);
          params.push(value);
        } else if (typeof value === 'boolean') {
          conditions.push(`(data->>'${field.replace(/'/g, "''")}')::boolean = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    }

    // Build full-text search condition
    if (query.search) {
      // Search in all string fields of the JSON data
      const searchConditions: string[] = [];
      const searchTerm = `%${query.search.toLowerCase()}%`;
      if (validFilterFields.length > 0) {
        for (const field of validFilterFields) {
          const fieldSchema = schema.properties?.[field];
          if (fieldSchema?.type === 'string') {
            // Escape field name to prevent injection (already validated against schema)
            const escapedField = field.replace(/'/g, "''");
            searchConditions.push(`LOWER(data->>'${escapedField}') LIKE $${paramIndex}`);
          }
        }
      }
      if (searchConditions.length > 0) {
        conditions.push(`(${searchConditions.join(' OR ')})`);
        params.push(searchTerm);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY "createdAt" DESC';
    if (query.sort) {
      const sortFields: string[] = [];
      query.sort.split(',').forEach((field: string) => {
        const desc = field.startsWith('-');
        const fieldName = desc ? field.slice(1) : field;
        // Validate field name to prevent injection
        const validFields = ['createdAt', 'updatedAt', 'status'];
        if (validFields.includes(fieldName)) {
          sortFields.push(`"${fieldName}" ${desc ? 'DESC' : 'ASC'}`);
        }
      });
      if (sortFields.length > 0) {
        orderByClause = `ORDER BY ${sortFields.join(', ')}`;
      }
    }

    // Add pagination parameters
    params.push(query.pageSize, skip);
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;

    // Use raw SQL for efficient JSON filtering and search
    // This avoids fetching all records and filtering in memory
    const entries = (await this.prisma.$queryRawUnsafe(
      `
        SELECT 
          ce.*,
          json_build_object(
            'id', ct.id,
            'name', ct.name,
            'slug', ct.slug
          ) as "contentType"
        FROM content_entries ce
        INNER JOIN content_types ct ON ce."contentTypeId" = ct.id
        ${whereClause}
        ${orderByClause}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `,
      ...params,
    )) as any[];

    // Get total count with same filters (without pagination params)
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = (await this.prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as count
        FROM content_entries ce
        ${whereClause}
      `,
      ...countParams,
    )) as Array<{ count: bigint }>;
    const total = Number(countResult[0]?.count || 0);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      entries: entries.map((entry: any) => ({
        ...entry,
        contentType: entry.contentType,
      })),
    };
  }

  /**
   * Get a single content entry by ID
   */
  async get(tenantId: string, contentTypeSlug: string, id: string) {
    const contentType = await this.getContentType(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        tenantId,
        contentTypeId: contentType.id,
        id,
      },
      include: {
        contentType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    return entry;
  }

  /**
   * Update a content entry
   */
  async update(
    tenantId: string,
    contentTypeSlug: string,
    id: string,
    dto: UpdateContentEntryDto
  ) {
    const contentType = await this.getContentType(tenantId, contentTypeSlug);
    
    const current = await this.prisma.contentEntry.findFirst({
      where: {
        tenantId,
        contentTypeId: contentType.id,
        id,
      },
    });

    if (!current) {
      throw new NotFoundException('Content entry not found');
    }

    const updateData: {
      data?: Record<string, unknown>;
      status?: string;
    } = {};

    if (dto.data !== undefined) {
      const schema = contentType.schema as Record<string, unknown>;
      await this.validateDataAgainstSchema(schema, dto.data);
      updateData.data = dto.data;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    return this.prisma.contentEntry.update({
      where: { id: current.id },
      data: updateData as any,
      include: {
        contentType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Delete a content entry
   */
  async remove(tenantId: string, contentTypeSlug: string, id: string) {
    const contentType = await this.getContentType(tenantId, contentTypeSlug);
    
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        tenantId,
        contentTypeId: contentType.id,
        id,
      },
    });

    if (!entry) {
      throw new NotFoundException('Content entry not found');
    }

    await this.prisma.contentEntry.delete({
      where: { id },
    });

    return { ok: true };
  }
}

