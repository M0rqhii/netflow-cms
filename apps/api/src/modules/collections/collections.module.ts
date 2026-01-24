import { Module, Logger, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';
import { AuthModule } from '../../common/auth/auth.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { ContentVersioningModule } from '../content-versioning/content-versioning.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { HooksModule } from '../hooks/hooks.module';
import { CollectionsController } from './controllers/collections.controller';
import { CollectionItemsController } from './controllers/items.controller';
import { CollectionsService } from './services/collections.service';
import { CollectionItemsService } from './services/items.service';

/**
 * CollectionsModule - moduł dla Collections feature
 * AI Note: Importuj w app.module.ts
 */
@Module({
  imports: [
    AuthModule,
    WorkflowModule,
    forwardRef(() => ContentVersioningModule),
    forwardRef(() => WebhooksModule),
    forwardRef(() => HooksModule),
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => {
        const disableRedis = process.env.REDIS_DISABLED === '1' || process.env.NODE_ENV === 'test';
        if (disableRedis) {
          return { ttl: 30 };
        }
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = process.env.REDIS_PORT ?? '6379';
        const url = process.env.REDIS_URL ?? `redis://${host}:${port}`;
        const logger = new Logger('CollectionsModule');
        try {
          const store = await redisStore({ url });
          logger.log(`Redis cache connected at ${url}`);
          return {
            store,
            ttl: 30, // seconds
          };
        } catch (error) {
          logger.warn(`Redis unavailable at ${url}, falling back to memory store`, error);
          // Fallback to memory store
          return {
            ttl: 30, // seconds
          };
        }
      },
    }),
  ],
  providers: [PrismaService, PrismaOptimizationService, CollectionsService, CollectionItemsService],
  controllers: [CollectionsController, CollectionItemsController],
  exports: [CollectionsService, CollectionItemsService],
})
export class CollectionsModule {}
