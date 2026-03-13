import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './common/health/redis-health.indicator';
import { DatabaseHealthIndicator } from './common/health/database-health.indicator';

@Controller('health')
export class HealthController {
  private isRedisEnabled() {
    return process.env.REDIS_DISABLED !== '1';
  }

  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private databaseHealth: DatabaseHealthIndicator,
  ) {}

  @Get()
  @Throttle(10000, 60) // Very high limit for health checks (10000 per minute)
  @HealthCheck()
  check() {
    const indicators = [
      // Database health check
      () => this.databaseHealth.isHealthy('database'),
      // Memory health check (warn if > 80% used)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB
      // Disk health check (warn if > 80% used)
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.8,
        }),
    ];

    if (this.isRedisEnabled()) {
      indicators.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(indicators);
  }

  @Get('liveness')
  @Throttle(10000, 60) // Very high limit for health checks
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('readiness')
  @Throttle(10000, 60) // Very high limit for health checks
  @HealthCheck()
  readiness() {
    const indicators = [() => this.databaseHealth.isHealthy('database')];

    if (this.isRedisEnabled()) {
      indicators.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(indicators);
  }
}

