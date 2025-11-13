import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Global Cache Module - Redis caching strategy
 * AI Note: Provides global Redis cache for the entire application
 * Falls back to memory store if Redis is unavailable
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<string>('REDIS_PORT') || '6379';
        const url = configService.get<string>('REDIS_URL') || `redis://${host}:${port}`;
        // Optimized: Increased default TTL for better cache hit rate
        // Content types and collections change infrequently, so longer TTL is safe
        const ttl = configService.get<number>('CACHE_TTL') || 600; // 10 minutes default (increased from 5)

        const logger = new Logger('CacheModule');
        try {
          const store = await redisStore({
            url,
            ttl: ttl * 1000, // Convert to milliseconds
          });

          logger.log(`Redis cache connected at ${url}`);
          return {
            store: () => store,
            ttl: ttl * 1000,
          };
        } catch (error) {
          logger.warn(`Redis unavailable at ${url}, falling back to memory store`, error);
          // Fallback to memory store
          return {
            ttl: ttl * 1000,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}

