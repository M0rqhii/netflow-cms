import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { CACHE_KEY, CACHE_TTL } from './cache.decorator';
import { MonitoringService } from '../monitoring/monitoring.service';

/**
 * Cache Interceptor - automatically caches method results
 * AI Note: Intercepts method calls and caches results based on @Cache() decorator
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
    @Optional() @Inject(forwardRef(() => MonitoringService)) private monitoringService?: MonitoringService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ttl = this.reflector.get<number>(CACHE_TTL, context.getHandler());
    const customKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());

    if (!ttl) {
      // No cache configured, proceed normally
      return next.handle();
    }

    // Generate cache key
    const request = context.switchToHttp().getRequest();
    const cacheKey = customKey || this.generateCacheKey(context, request);

    // Try to get from cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      // Track cache hit
      if (this.monitoringService) {
        this.monitoringService.trackCacheHit();
      }
      return of(cached);
    }

    // Track cache miss
    if (this.monitoringService) {
      this.monitoringService.trackCacheMiss();
    }

    // Execute and cache result
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheManager.set(cacheKey, data, ttl * 1000);
      }),
    );
  }

  private generateCacheKey(context: ExecutionContext, request: any): string {
    const handler = context.getHandler();
    const controller = context.getClass();
    const methodName = handler.name;
    const className = controller.name;
    const params = JSON.stringify(request.params || {});
    const query = JSON.stringify(request.query || {});
    const scopeId = request.siteId || request.orgId || 'global';

    return `${className}:${methodName}:${scopeId}:${params}:${query}`;
  }
}

