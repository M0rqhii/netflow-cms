import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Monitoring Service
 * Tracks performance metrics and cache statistics
 * 
 * Features:
 * - Query performance monitoring
 * - Cache hit rate tracking
 * - Slow query detection
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private queryMetrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();
  private cacheStats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor(
    // @ts-ignore - Reserved for future use
    private _prisma: PrismaService,
    // @ts-ignore - Reserved for future use
    @Inject(CACHE_MANAGER) private _cache: Cache,
  ) {
    // Setup Prisma query logging for performance monitoring
    this.setupQueryLogging();
  }

  /**
   * Setup Prisma query logging to track slow queries
   */
  private setupQueryLogging() {
    // Prisma query logging is configured in PrismaService
    // This method can be extended to add custom query tracking
  }

  /**
   * Track query performance
   */
  trackQuery(model: string, action: string, duration: number) {
    const key = `${model}.${action}`;
    const existing = this.queryMetrics.get(key) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.queryMetrics.set(key, existing);

    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      this.logger.warn(`Slow query detected: ${key} took ${duration}ms`);
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit() {
    this.cacheStats.hits++;
  }

  /**
   * Track cache miss
   */
  trackCacheMiss() {
    this.cacheStats.misses++;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total === 0) return 0;
    return (this.cacheStats.hits / total) * 100;
  }

  /**
   * Get query metrics
   */
  getQueryMetrics(): Record<string, { count: number; avgTime: number; totalTime: number }> {
    const metrics: Record<string, { count: number; avgTime: number; totalTime: number }> = {};
    this.queryMetrics.forEach((value, key) => {
      metrics[key] = {
        count: value.count,
        avgTime: value.avgTime,
        totalTime: value.totalTime,
      };
    });
    return metrics;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      cache: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: this.getCacheHitRate(),
      },
      queries: this.getQueryMetrics(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.queryMetrics.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }
}

