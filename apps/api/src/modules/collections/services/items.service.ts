import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../../common/prisma/prisma-optimization.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { z } from 'zod';
import { ItemQueryDto, UpsertItemDto } from '../dto';
import { WorkflowConfigService } from '../../workflow/workflow-config.service';
import { ContentVersioningService } from '../../content-versioning/content-versioning.service';
import { WebhooksService, WebhookEvent } from '../../webhooks/webhooks.service';
import { HooksService } from '../../hooks/hooks.service';

/**
 * CollectionItemsService - business logic dla Collection Items
 * AI Note: Zawsze filtruj po siteId - site isolation
 */
@Injectable()
export class CollectionItemsService {
  private readonly logger = new Logger(CollectionItemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaOptimization: PrismaOptimizationService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly workflowConfig: WorkflowConfigService,
    @Inject(forwardRef(() => ContentVersioningService))
    private readonly versioningService: ContentVersioningService,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    @Inject(forwardRef(() => HooksService))
    private readonly hooksService: HooksService,
  ) {}

  private async getCollection(siteId: string, slug: string) {
    const cacheKey = `col:${siteId}:${slug}`;
    const cached = await this.cache.get<{
      id: string;
      siteId: string;
      slug: string;
      name: string;
      schemaJson: Record<string, any>;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const collection = await this.prisma.collection.findFirst({
      where: { siteId, slug },
      select: {
        id: true,
        siteId: true,
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

    // Optimized: Increased TTL for collections (they change infrequently)
    await this.cache.set(cacheKey, collection, 600 * 1000); // 10 minutes TTL in milliseconds
    return collection;
  }

  async list(siteId: string, slug: string, query: ItemQueryDto) {
    const collection = await this.getCollection(siteId, slug);
    const skip = (query.page - 1) * query.pageSize;

    const where: {
      siteId: string;
      collectionId: string;
      status?: 'DRAFT' | 'PUBLISHED';
    } = {
      siteId,
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

    // Optimized: Use PrismaOptimizationService with select only needed fields
    const [total, items] = await Promise.all([
      this.prismaOptimization.countOptimized('collectionItem', where),
      this.prismaOptimization.findManyOptimized(
        'collectionItem',
        where,
        {
          id: true,
          siteId: true,
          collectionId: true,
          data: true,
          status: true,
          version: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          updatedById: true,
        },
        {
          skip,
          take: query.pageSize,
          orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
        },
      ),
    ]);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      items,
    };
  }

  async validateDataAgainstSchema(
    _schemaJson: Record<string, any>,
    data: Record<string, any> | null
  ): Promise<Record<string, any>> {
    // Placeholder validation - można rozszerzyć o kompilację Zod z schemaJson
    // Na razie podstawowa walidacja typu
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Data validation failed: invalid data');
    }
    try {
      const schema = z.record(z.unknown());
      return schema.parse(data) as Record<string, any>;
    } catch (error) {
      throw new BadRequestException('Data validation failed');
    }
  }

  async create(
    siteId: string,
    slug: string,
    dto: UpsertItemDto,
    userId?: string
  ) {
    const collection = await this.getCollection(siteId, slug);
    const schemaJson = collection.schemaJson as Record<string, any>;
    await this.validateDataAgainstSchema(schemaJson, dto.data);

    // Validate initial status
    const workflowConfig = await this.workflowConfig.getWorkflowConfig(siteId, collection.id);
    const initialStatus = dto.status || 'DRAFT';
    const validation = this.workflowConfig.validateStatusTransition(
      workflowConfig,
      'DRAFT', // Starting from draft
      initialStatus,
    );
    
    if (!validation.valid) {
      throw new BadRequestException(validation.reason || 'Invalid initial status');
    }

    const item = await this.prisma.collectionItem.create({
      data: {
        siteId,
        collectionId: collection.id,
        data: dto.data,
        status: initialStatus,
        createdById: userId,
        publishedAt: initialStatus === 'PUBLISHED' ? new Date() : null,
      },
      select: {
        id: true,
        siteId: true,
        collectionId: true,
        data: true,
        status: true,
        version: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
        etag: true,
      },
    });

    // Create automatic tasks if status is not draft
    if (initialStatus !== 'DRAFT' && userId) {
      await this.workflowConfig.createAutoTasks(
        siteId,
        collection.id,
        item.id,
        'DRAFT',
        initialStatus,
        userId,
      );
    }

    // Create initial version snapshot
    await this.versioningService.createVersion(
      siteId,
      item.id,
      dto.data,
      initialStatus,
      userId,
      'Initial version',
    );

    // Execute hooks (before)
    try {
      await this.hooksService.executeHooks(
        siteId,
        'item.create',
        { item, collection },
        collection.id,
      );
    } catch (error) {
      // Hook failure might prevent creation - log but continue for now
      this.logger.error('Hook execution failed:', error instanceof Error ? error.stack : String(error));
    }

    // Trigger webhook
    await this.webhooksService.trigger(
      siteId,
      WebhookEvent.COLLECTION_ITEM_CREATED,
      { item, collection },
      collection.id,
    );

    return item;
  }

  async get(siteId: string, slug: string, id: string) {
    const collection = await this.getCollection(siteId, slug);
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        siteId,
        collectionId: collection.id,
        id,
      },
      select: {
        id: true,
        siteId: true,
        collectionId: true,
        data: true,
        status: true,
        version: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
        etag: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    return item;
  }

  async update(
    siteId: string,
    slug: string,
    id: string,
    dto: UpsertItemDto,
    userId?: string
  ) {
    const collection = await this.getCollection(siteId, slug);
    const current = await this.prisma.collectionItem.findFirst({
      where: {
        siteId,
        collectionId: collection.id,
        id,
      },
      select: {
        id: true,
        siteId: true,
        collectionId: true,
        data: true,
        status: true,
        version: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
        etag: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Collection item not found');
    }

    // Optimistic locking
    if (dto.version && dto.version !== current.version) {
      throw new ConflictException('Version mismatch - item was modified');
    }

    // Validate status transition if status is changing
    if (dto.status && dto.status !== current.status) {
      const workflowConfig = await this.workflowConfig.getWorkflowConfig(siteId, collection.id);
      const validation = this.workflowConfig.validateStatusTransition(
        workflowConfig,
        current.status,
        dto.status,
      );
      
      if (!validation.valid) {
        throw new BadRequestException(validation.reason || 'Invalid status transition');
      }
    }

    const schemaJson = collection.schemaJson as Record<string, any>;
    await this.validateDataAgainstSchema(schemaJson, dto.data);

    const nextVersion = current.version + 1;
    const oldStatus = current.status;
    const newStatus = dto.status || current.status;

    // Execute hooks (before update)
    let transformedData = dto.data;
    try {
      const hookResult = await this.hooksService.executeHooks(
        siteId,
        'item.update',
        { item: current, data: dto.data, oldStatus, newStatus, collection },
        collection.id,
      );
      if (hookResult && hookResult.data) {
        transformedData = hookResult.data;
      }
    } catch (error) {
      // Hook failure might prevent update
      throw new BadRequestException(`Hook execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create version snapshot before update
    await this.versioningService.createVersion(
      siteId,
      current.id,
      current.data,
      current.status,
      userId,
      dto.changeNote,
    );

    const updated = await this.prisma.collectionItem.update({
      where: { id: current.id },
      data: {
        data: transformedData,
        status: newStatus,
        version: nextVersion,
        updatedById: userId,
        publishedAt:
          newStatus === 'PUBLISHED' ? new Date() : current.publishedAt,
      },
      select: {
        id: true,
        siteId: true,
        collectionId: true,
        data: true,
        status: true,
        version: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
        etag: true,
      },
    });

    // Create automatic tasks if status changed
    if (oldStatus !== newStatus && userId) {
      await this.workflowConfig.createAutoTasks(
        siteId,
        collection.id,
        id,
        oldStatus,
        newStatus,
        userId,
      );
    }

    // Trigger webhook
    await this.webhooksService.trigger(
      siteId,
      WebhookEvent.COLLECTION_ITEM_UPDATED,
      { item: updated, oldItem: current, collection },
      collection.id,
    );

    // Execute hooks (after update)
    try {
      await this.hooksService.executeHooks(
        siteId,
        'item.updated',
        { item: updated, oldItem: current, collection },
        collection.id,
      );
    } catch (error) {
      // Log but don't fail
      this.logger.error('After hook execution failed:', error instanceof Error ? error.stack : String(error));
    }

    return updated;
  }

  async remove(siteId: string, slug: string, id: string) {
    const collection = await this.getCollection(siteId, slug);
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        siteId,
        collectionId: collection.id,
        id,
      },
      select: {
        id: true,
        siteId: true,
        collectionId: true,
        data: true,
        status: true,
        version: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        updatedById: true,
        etag: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    // Execute hooks (before delete)
    try {
      await this.hooksService.executeHooks(
        siteId,
        'item.delete',
        { item, collection },
        collection.id,
      );
    } catch (error) {
      // Hook failure might prevent deletion
      throw new BadRequestException(`Hook execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    await this.prisma.collectionItem.delete({
      where: { id },
    });

    // Trigger webhook
    await this.webhooksService.trigger(
      siteId,
      WebhookEvent.COLLECTION_ITEM_DELETED,
      { item, collection },
      collection.id,
    );

    return { ok: true };
  }
}

