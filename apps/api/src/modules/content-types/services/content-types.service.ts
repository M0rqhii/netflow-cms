import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateContentTypeDto,
  UpdateContentTypeDto,
  ContentTypeField,
} from '../dto';

/**
 * ContentTypesService - business logic dla Content Types
 * AI Note: Zawsze filtruj po tenantId - multi-tenant isolation
 */
@Injectable()
export class ContentTypesService {
  constructor(private readonly prisma: PrismaService) {}

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
    tenantId: string,
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

      return await this.prisma.contentType.create({
        data: {
          tenantId,
          name: dto.name,
          slug: dto.slug,
          schema,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Content type slug already exists for this tenant');
      }
      throw e;
    }
  }

  async list(tenantId: string) {
    return this.prisma.contentType.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const contentType = await this.prisma.contentType.findFirst({
      where: { tenantId, id },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    return contentType;
  }

  async getBySlug(tenantId: string, slug: string) {
    const contentType = await this.prisma.contentType.findFirst({
      where: { tenantId, slug },
    });

    if (!contentType) {
      throw new NotFoundException('Content type not found');
    }

    return contentType;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateContentTypeDto
  ) {
    const found = await this.getById(tenantId, id);
    
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
      return await this.prisma.contentType.update({
        where: { id: found.id },
        data: updateData,
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Content type slug already exists for this tenant');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    const found = await this.getById(tenantId, id);
    
    // Check if there are any content entries using this content type
    const entryCount = await this.prisma.contentEntry.count({
      where: {
        tenantId,
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
    
    return { ok: true };
  }
}

