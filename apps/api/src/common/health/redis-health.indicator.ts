import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { createClient } from 'redis';

/**
 * Redis Health Indicator
 * Checks Redis connection health
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;
    const url = process.env.REDIS_URL || `redis://${host}:${port}`;

    try {
      const client = createClient({
        url,
        password,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: false,
        },
      });

      await client.connect();
      await client.ping();
      await client.quit();

      return this.getStatus(key, true, { host, port });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis connection failed';
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
