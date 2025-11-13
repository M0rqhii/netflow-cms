import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { z } from 'zod';
import { ItemQueryDto, UpsertItemDto } from '../dto';

/**
 * CollectionItemsService - business logic dla Collection Items
 * AI Note: Zawsze filtruj po tenantId - multi-tenant isolation
 */
@Injectable()
export class CollectionItemsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ) {}

  private async getCollection(tenantId: string, slug: string) {
    const cacheKey = `col:${tenantId}:${slug}`;
    const cached = await this.cache.get<{
      id: string;
      tenantId: string;
      slug: string;
      name: string;
      schemaJson: Record<string, unknown>;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, slug },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Optimized: Increased TTL for collections (they change infrequently)
    await this.cache.set(cacheKey, collection, 600); // 10 minutes TTL (increased from 30 seconds)
    return collection;
  }

  async list(tenantId: string, slug: string, query: ItemQueryDto) {
    const collection = await this.getCollection(tenantId, slug);
    const skip = (query.page - 1) * query.pageSize;

    const where: {
      tenantId: string;
      collectionId: string;
      status?: 'DRAFT' | 'PUBLISHED';
    } = {
      tenantId,
      collectionId: collection.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    // Basic filter support - można rozszerzyć w przyszłości
    // Prisma JSON filtering wymaga specjalnej składni
    // Na razie podstawowa implementacja bez filtrowania po data fields

    const orderBy: Array<Record<string, 'asc' | 'desc'>> = [];
    if (query.sort) {
      query.sort.split(',').forEach((field: string) => {
        const desc = field.startsWith('-');
        const fieldName = desc ? field.slice(1) : field;
        // Validate field name to prevent injection
        const validFields = ['createdAt', 'updatedAt', 'version', 'publishedAt'];
        if (validFields.includes(fieldName)) {
          orderBy.push({ [fieldName]: desc ? 'desc' : 'asc' });
        }
      });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.collectionItem.count({ where }),
      this.prisma.collectionItem.findMany({
        where,
        take: query.pageSize,
        skip,
        orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
      }),
    ]);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items,
    };
  }

  async validateDataAgainstSchema(
    _schemaJson: Record<string, unknown>,
    data: Record<string, unknown> | null
  ): Promise<Record<string, unknown>> {
    // Placeholder validation - można rozszerzyć o kompilację Zod z schemaJson
    // Na razie podstawowa walidacja typu
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Data validation failed: invalid data');
    }
    try {
      const schema = z.record(z.unknown());
      return schema.parse(data) as Record<string, unknown>;
    } catch (error) {
      throw new BadRequestException('Data validation failed');
    }
  }

  async create(
    tenantId: string,
    slug: string,
    dto: UpsertItemDto,
    userId?: string
  ) {
    const collection = await this.getCollection(tenantId, slug);
    const schemaJson = collection.schemaJson as Record<string, unknown>;
    await this.validateDataAgainstSchema(schemaJson, dto.data);

    return this.prisma.collectionItem.create({
      data: {
        tenantId,
        collectionId: collection.id,
        data: dto.data,
        status: dto.status,
        createdById: userId,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
      },
    });
  }

  async get(tenantId: string, slug: string, id: string) {
    const collection = await this.getCollection(tenantId, slug);
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        tenantId,
        collectionId: collection.id,
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    return item;
  }

  async update(
    tenantId: string,
    slug: string,
    id: string,
    dto: UpsertItemDto,
    userId?: string
  ) {
    const collection = await this.getCollection(tenantId, slug);
    const current = await this.prisma.collectionItem.findFirst({
      where: {
        tenantId,
        collectionId: collection.id,
        id,
      },
    });

    if (!current) {
      throw new NotFoundException('Collection item not found');
    }

    // Optimistic locking
    if (dto.version && dto.version !== current.version) {
      throw new ConflictException('Version mismatch - item was modified');
    }

    const schemaJson = collection.schemaJson as Record<string, unknown>;
    await this.validateDataAgainstSchema(schemaJson, dto.data);

    const nextVersion = current.version + 1;

    return this.prisma.collectionItem.update({
      where: { id: current.id },
      data: {
        data: dto.data,
        status: dto.status,
        version: nextVersion,
        updatedById: userId,
        publishedAt:
          dto.status === 'PUBLISHED' ? new Date() : current.publishedAt,
      },
    });
  }

  async remove(tenantId: string, slug: string, id: string) {
    const collection = await this.getCollection(tenantId, slug);
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        tenantId,
        collectionId: collection.id,
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    await this.prisma.collectionItem.delete({
      where: { id },
    });

    return { ok: true };
  }
}

