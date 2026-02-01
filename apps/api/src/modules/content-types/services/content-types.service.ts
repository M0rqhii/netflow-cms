import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  CreateContentTypeDto,
  UpdateContentTypeDto,
  ContentTypeField,
} from '../dto';

/**
 * ContentTypesService - business logic dla Content Types
 * AI Note: Zawsze filtruj po siteId - site isolation
 */
@Injectable()
export class ContentTypesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Convert fields array to JSON Schema format
   */
  private fieldsToJsonSchema(fields: ContentTypeField[]): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of fields) {
      let schema: any = {};

      switch (field.type) {
        case 'text':
        case 'richtext':
          schema = { type: 'string' };
          if (field.minLength) schema.minLength = field.minLength;
          if (field.maxLength) schema.maxLength = field.maxLength;
          break;
        case 'number':
          schema = { type: 'number' };
          if (field.min !== undefined) schema.minimum = field.min;
          if (field.max !== undefined) schema.maximum = field.max;
          break;
        case 'boolean':
          schema = { type: 'boolean' };
          break;
        case 'date':
          schema = { type: 'string', format: 'date' };
          break;
        case 'datetime':
          schema = { type: 'string', format: 'date-time' };
          break;
        case 'relation':
          // Relation field - stores reference to another content entry
          schema = {
            type: 'string',
            format: 'uuid',
            relationType: field.relationType || 'manyToOne',
            relatedContentTypeId: field.relatedContentTypeId,
          };
          break;
        case 'object':
          // Nested object - recursive schema
          if (field.fields && field.fields.length > 0) {
            schema = {
              type: 'object',
              properties: this.fieldsToJsonSchema(field.fields).properties,
              required: this.fieldsToJsonSchema(field.fields).required,
            };
          } else {
            schema = { type: 'object' };
          }
          break;
        case 'array':
          // Array field - can contain multiple values
          if (field.items) {
            const itemSchema = this.fieldsToJsonSchema([field.items]).properties[field.items.name];
            schema = {
              type: 'array',
              items: itemSchema,
            };
          } else {
            schema = { type: 'array', items: { type: 'string' } };
          }
          break;
        case 'media':
          schema = { type: 'string', format: 'uuid' }; // Store as MediaFile ID reference
          break;
        case 'json':
          schema = { type: 'object' };
          break;
        default:
          schema = { type: 'string' };
      }

      if (field.description) {
        schema.description = field.description;
      }

      properties[field.name] = schema;

      if (field.required) {
        required.push(field.name);
      }
    }

    const schema: Record<string, any> = {
      type: 'object',
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  async create(
    siteId: string,
    dto: CreateContentTypeDto
  ) {
    try {
      let schema: Record<string, any>;

      if (dto.fields) {
        schema = this.fieldsToJsonSchema(dto.fields);
      } else if (dto.schema) {
        schema = dto.schema;
      } else {
        throw new Error('Either fields or schema must be provided');
      }

      const result = await this.prisma.contentType.create({
        data: {
          siteId,
          name: dto.name,
          slug: dto.slug,
          schema,
        },
        select: {
          id: true,
          siteId: true,
          name: true,
          slug: true,
          schema: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Invalidate list cache
      await this.cache.del(`content-types:${siteId}:list`);

      return result;
    } catch (e: any) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Content type slug already exists for this site');
      }
      throw e;
    }
  }

  async list(siteId: string) {
    const cacheKey = `content-types:${siteId}:list`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.contentType.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        siteId: true,
        name: true,
        slug: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Cache for 10 minutes (content types change infrequently)
    await this.cache.set(cacheKey, result, 600 * 1000); // TTL in milliseconds
    return result;
  }

  async getById(siteId: string, id: string): Promise<{
    id: string;
    siteId: string;
    name: string;
    slug: string;
    schema: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const cacheKey = `content-types:${siteId}:${id}`;
    const cached = await this.cache.get<{
      id: string;
      siteId: string;
      name: string;
      slug: string;
      schema: any;
      createdAt: Date;
      updatedAt: Date;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const contentType = await this.prisma.contentType.findFirst({
      where: { siteId, id },
      select: {
        id: true,
        siteId: true,
        name: true,
        slug: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    // Cache for 10 minutes
    await this.cache.set(cacheKey, contentType, 600 * 1000); // TTL in milliseconds
    return contentType;
  }

  async getBySlug(siteId: string, slug: string): Promise<{
    id: string;
    siteId: string;
    name: string;
    slug: string;
    schema: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const cacheKey = `content-types:${siteId}:slug:${slug}`;
    const cached = await this.cache.get<{
      id: string;
      siteId: string;
      name: string;
      slug: string;
      schema: any;
      createdAt: Date;
      updatedAt: Date;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const contentType = await this.prisma.contentType.findFirst({
      where: { siteId, slug },
      select: {
        id: true,
        siteId: true,
        name: true,
        slug: true,
        schema: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    // Cache for 10 minutes
    await this.cache.set(cacheKey, contentType, 600 * 1000); // TTL in milliseconds
    return contentType;
  }

  async update(
    siteId: string,
    id: string,
    dto: UpdateContentTypeDto
  ) {
    const found = await this.getById(siteId, id);
    if (!found) {
      throw new NotFoundException('Content type not found');
    }
    
    const updateData: any = {};
    
    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    
    if (dto.slug !== undefined) {
      updateData.slug = dto.slug;
    }
    
    if (dto.fields) {
      updateData.schema = this.fieldsToJsonSchema(dto.fields);
    } else if (dto.schema) {
      updateData.schema = dto.schema;
    }

    try {
      const result = await this.prisma.contentType.update({
        where: { id: found.id },
        data: updateData,
        select: {
          id: true,
          siteId: true,
          name: true,
          slug: true,
          schema: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Invalidate cache
      await Promise.all([
        this.cache.del(`content-types:${siteId}:list`),
        this.cache.del(`content-types:${siteId}:${id}`),
        this.cache.del(`content-types:${siteId}:slug:${found.slug}`),
        dto.slug && dto.slug !== found.slug
          ? this.cache.del(`content-types:${siteId}:slug:${dto.slug}`)
          : Promise.resolve(),
      ]);

      return result;
    } catch (e: any) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Content type slug already exists for this site');
      }
      throw e;
    }
  }

  async remove(siteId: string, id: string) {
    const found = await this.getById(siteId, id);
    if (!found) {
      throw new NotFoundException('Content type not found');
    }
    
    // Check if there are any content entries using this content type
    const entryCount = await this.prisma.contentEntry.count({
      where: {
        siteId,
        contentTypeId: id,
      },
    });

    if (entryCount > 0) {
      throw new ConflictException(
        `Cannot delete content type: ${entryCount} content entry(ies) are using it`
      );
    }

    await this.prisma.contentType.delete({
      where: { id: found.id },
    });

    // Invalidate cache
    await Promise.all([
      this.cache.del(`content-types:${siteId}:list`),
      this.cache.del(`content-types:${siteId}:${id}`),
      this.cache.del(`content-types:${siteId}:slug:${found.slug}`),
    ]);
    
    return { ok: true };
  }
}

