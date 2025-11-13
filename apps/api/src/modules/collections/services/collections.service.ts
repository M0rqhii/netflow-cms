import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateCollectionDto
  ) {
    try {
      return await this.prisma.collection.create({
        data: {
          tenantId,
          slug: dto.slug,
          name: dto.name,
          schemaJson: dto.schemaJson,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException('Collection slug already exists for this tenant');
      }
      throw e;
    }
  }

  async list(tenantId: string) {
    return this.prisma.collection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySlug(tenantId: string, slug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, slug },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async update(
    tenantId: string,
    slug: string,
    dto: UpdateCollectionDto
  ) {
    const found = await this.getBySlug(tenantId, slug);
    return this.prisma.collection.update({
      where: { id: found.id },
      data: dto,
    });
  }

  async remove(tenantId: string, slug: string) {
    const found = await this.getBySlug(tenantId, slug);
    await this.prisma.collection.delete({
      where: { id: found.id },
    });
    return { ok: true };
  }
}

