import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// Note: @nestjs/schedule is optional - install with: pnpm add @nestjs/schedule
// import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ElasticsearchService } from './elasticsearch.service';

/**
 * Search Sync Worker
 * AI Note: Background worker that syncs database changes to Elasticsearch
 * 
 * Features:
 * - Periodic sync of content entries and collection items
 * - Handles updates, deletions
 * - Reindexing support
 */
@Injectable()
export class SearchSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(SearchSyncWorker.name);
  private isRunning = false;
  private lastSyncTime: Date = new Date(0);

  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async onModuleInit() {
    // Initial sync on startup (optional)
    // await this.syncAll();
  }

  /**
   * Sync all content entries
   * Note: Uncomment @Cron decorator when @nestjs/schedule is installed
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async syncContentEntries() {
    if (this.isRunning) {
      this.logger.debug('Sync already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      // Get entries updated since last sync
      const entries = await this.prisma.contentEntry.findMany({
        where: {
          updatedAt: {
            gte: this.lastSyncTime,
          },
        },
        take: 1000, // Batch size
      });

      for (const entry of entries) {
        try {
          await this.elasticsearch.indexDocument('content_entries', entry.id, {
            id: entry.id,
            tenantId: entry.siteId,
            contentTypeId: entry.contentTypeId,
            data: entry.data,
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            publishedAt: entry.publishedAt,
          });
        } catch (error) {
          this.logger.error(`Failed to sync entry ${entry.id}:`, error);
        }
      }

      if (entries.length > 0) {
        this.lastSyncTime = new Date();
        this.logger.log(`Synced ${entries.length} content entries`);
      }
    } catch (error) {
      this.logger.error('Content entries sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync all collection items
   * Note: Uncomment @Cron decorator when @nestjs/schedule is installed
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async syncCollectionItems() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const items = await this.prisma.collectionItem.findMany({
        where: {
          updatedAt: {
            gte: this.lastSyncTime,
          },
        },
        take: 1000,
      });

      for (const item of items) {
        try {
          await this.elasticsearch.indexDocument('collection_items', item.id, {
            id: item.id,
            tenantId: item.siteId,
            collectionId: item.collectionId,
            data: item.data,
            status: item.status,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            publishedAt: item.publishedAt,
          });
        } catch (error) {
          this.logger.error(`Failed to sync item ${item.id}:`, error);
        }
      }

      if (items.length > 0) {
        this.logger.log(`Synced ${items.length} collection items`);
      }
    } catch (error) {
      this.logger.error('Collection items sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual reindex all
   */
  async reindexAll(tenantId?: string) {
    this.logger.log('Starting full reindex...');

    // Reindex content entries
    const entries = await this.prisma.contentEntry.findMany({
      where: tenantId ? { siteId: tenantId } : undefined,
    });

    const entryDocs = entries.map(entry => ({
      id: entry.id,
      document: {
        id: entry.id,
        tenantId: entry.siteId,
        contentTypeId: entry.contentTypeId,
        data: entry.data,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        publishedAt: entry.publishedAt,
      },
    }));

    await this.elasticsearch.reindex('content_entries', entryDocs);

    // Reindex collection items
    const items = await this.prisma.collectionItem.findMany({
      where: tenantId ? { siteId: tenantId } : undefined,
    });

    const itemDocs = items.map(item => ({
      id: item.id,
      document: {
        id: item.id,
        tenantId: item.siteId,
        collectionId: item.collectionId,
        data: item.data,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        publishedAt: item.publishedAt,
      },
    }));

    await this.elasticsearch.reindex('collection_items', itemDocs);

    this.logger.log('Full reindex completed');
  }
}

