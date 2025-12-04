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
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dto';

/**
 * CollectionsService - business logic dla Collections
 * AI Note: Zawsze filtruj po tenantId - multi-tenant isolation
 */
@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCollectionDto
  ) {
    try {
      const result = await this.prisma.collection.create({
        data: {
          tenantId,
          slug: dto.slug,
          name: dto.name,
          schemaJson: (dto.schemaJson || {}) as any, // Prisma Json type
        },
        select: {
          id: true,
          tenantId: true,
          slug: true,
          name: true,
          schemaJson: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Invalidate list cache
      await this.cache.del(`collections:${tenantId}:list`);

      return result;
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Collection slug already exists for this tenant');
      }
      throw e;
    }
  }

  async list(tenantId: string) {
    const cacheKey = `collections:${tenantId}:list`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.collection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        schemaJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Cache for 10 minutes (collections change infrequently)
    await this.cache.set(cacheKey, result, 600 * 1000); // TTL in milliseconds
    return result;
  }

  async getBySlug(tenantId: string, slug: string): Promise<{
    id: string;
    tenantId: string;
    slug: string;
    name: string;
    schemaJson: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const cacheKey = `col:${tenantId}:${slug}`;
    const cached = await this.cache.get<{
      id: string;
      tenantId: string;
      slug: string;
      name: string;
      schemaJson: any;
      createdAt: Date;
      updatedAt: Date;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, slug },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        schemaJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Cache for 10 minutes
    await this.cache.set(cacheKey, collection, 600 * 1000); // TTL in milliseconds
    return collection;
  }

  async update(
    tenantId: string,
    slug: string,
    dto: UpdateCollectionDto
  ) {
    const found = await this.getBySlug(tenantId, slug);
    if (!found) {
      throw new NotFoundException('Collection not found');
    }
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.schemaJson !== undefined) updateData.schemaJson = dto.schemaJson as any; // Prisma Json type
    
    const result = await this.prisma.collection.update({
      where: { id: found.id },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        schemaJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate cache
    await Promise.all([
      this.cache.del(`collections:${tenantId}:list`),
      this.cache.del(`col:${tenantId}:${slug}`),
      dto.slug && dto.slug !== slug
        ? this.cache.del(`col:${tenantId}:${dto.slug}`)
        : Promise.resolve(),
    ]);

    return result;
  }

  async remove(tenantId: string, slug: string) {
    const found = await this.getBySlug(tenantId, slug);
    await this.prisma.collection.delete({
      where: { id: found.id },
    });

    // Invalidate cache
    await Promise.all([
      this.cache.del(`collections:${tenantId}:list`),
      this.cache.del(`col:${tenantId}:${slug}`),
    ]);

    return { ok: true };
  }
}
