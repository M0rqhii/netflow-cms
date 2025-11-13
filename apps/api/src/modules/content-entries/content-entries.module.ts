import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuthModule } from '../../common/auth/auth.module';
import { ContentTypesModule } from '../content-types/content-types.module';
import { ContentEntriesController } from './controllers/content-entries.controller';
import { ContentEntriesService } from './services/content-entries.service';

/**
 * ContentEntriesModule - moduł dla Content Entries feature
 * AI Note: Importuj w app.module.ts
 */
@Module({
  imports: [
    TenantModule,
    AuthModule,
    ContentTypesModule,
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => {
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = process.env.REDIS_PORT ?? '6379';
        const url = process.env.REDIS_URL ?? `redis://${host}:${port}`;
        try {
          const store = await redisStore({ url });
          return {
            store,
            ttl: 30, // seconds
          };
        } catch (error) {
          const logger = new Logger('ContentEntriesModule');
          logger.error(`Failed to connect to Redis at ${url}.`, error);
          throw error;
        }
      },
    }),
  ],
  providers: [PrismaService, ContentEntriesService],
  controllers: [ContentEntriesController],
  exports: [ContentEntriesService],
})
export class ContentEntriesModule {}

