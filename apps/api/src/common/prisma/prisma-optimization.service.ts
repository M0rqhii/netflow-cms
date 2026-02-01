import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrometheusService } from '../monitoring/prometheus.service';

/**
 * Prisma Optimization Service
 * AI Note: Provides optimized database queries and connection pooling
 * 
 * Note: This service uses dynamic model access which requires type assertions.
 * Model names are validated at runtime to ensure safety.
 */
@Injectable()
export class PrismaOptimizationService {
  private readonly validModels = [
    'user',
    'organization',
    'site',
    'contentType',
    'contentEntry',
    'collection',
    'collectionItem',
    'mediaItem',
    'contentReview',
    'contentComment',
    'task',
    'collectionRole',
    'webhook',
    'webhookDelivery',
  ] as const;

  constructor(
    private prisma: PrismaService,
    @Optional() private prometheusService?: PrometheusService,
  ) {}

  /**
   * Validates that a model name is valid and exists on PrismaService
   */
  private validateModel(model: string): void {
    if (!this.validModels.includes(model as (typeof this.validModels)[number])) {
      throw new Error(`Invalid Prisma model: ${model}. Valid models: ${this.validModels.join(', ')}`);
    }
  }

  /**
   * Optimized findMany with select only needed fields
   * AI Note: Reduces data transfer by selecting only required fields
   */
  async findManyOptimized<T = unknown>(
    model: string,
    where: Record<string, any>,
    select?: Record<string, boolean>,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    },
  ): Promise<T[]> {
    this.validateModel(model);

    const query: {
      where: Record<string, any>;
      select?: Record<string, boolean>;
      skip?: number;
      take?: number;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    } = {
      where,
      ...(select && { select }),
      ...(options?.skip !== undefined && { skip: options.skip }),
      ...(options?.take !== undefined && { take: options.take }),
      ...(options?.orderBy && { orderBy: options.orderBy }),
    };

    // Use Prisma's select to reduce data transfer
    const startTime = Date.now();
    const modelClient = (this.prisma as any as Record<string, { findMany: (args: any) => Promise<T[]> }>)[model];
    if (!modelClient || typeof modelClient.findMany !== 'function') {
      throw new Error(`Prisma model ${model} does not have findMany method`);
    }
    const result = await modelClient.findMany(query);
    const duration = Date.now() - startTime;
    
    // Track metrics if PrometheusService is available
    if (this.prometheusService) {
      this.prometheusService.trackDbQuery(model, 'findMany', duration);
    }
    
    return result;
  }

  /**
   * Optimized findUnique with select only needed fields
   */
  async findUniqueOptimized<T = unknown>(
    model: string,
    where: Record<string, any>,
    select?: Record<string, boolean>,
  ): Promise<T | null> {
    this.validateModel(model);

    const query: {
      where: Record<string, any>;
      select?: Record<string, boolean>;
    } = {
      where,
      ...(select && { select }),
    };

    const startTime = Date.now();
    const modelClient = (this.prisma as any as Record<string, { findUnique: (args: any) => Promise<T | null> }>)[model];
    if (!modelClient || typeof modelClient.findUnique !== 'function') {
      throw new Error(`Prisma model ${model} does not have findUnique method`);
    }
    const result = await modelClient.findUnique(query);
    const duration = Date.now() - startTime;
    
    // Track metrics if PrometheusService is available
    if (this.prometheusService) {
      this.prometheusService.trackDbQuery(model, 'findUnique', duration);
    }
    
    return result;
  }

  /**
   * Batch operations for better performance
   * AI Note: Groups multiple operations into a single transaction
   * Note: Operations must return PrismaPromise for proper transaction handling
   */
  async batchOperation<T>(
    operations: Array<() => Promise<T>>,
  ): Promise<T[]> {
    // Use interactive transaction for operations that return regular Promises
    return this.prisma.$transaction(
      async () => {
        const results: T[] = [];
        for (const op of operations) {
          results.push(await op());
        }
        return results;
      },
      {
        maxWait: 5000, // Maximum time to wait for a transaction slot
        timeout: 10000, // Maximum time for the transaction to complete
      },
    );
  }

  /**
   * Optimized count with where clause
   */
  async countOptimized(
    model: string,
    where: Record<string, any>,
  ): Promise<number> {
    this.validateModel(model);

    const startTime = Date.now();
    const modelClient = (this.prisma as any as Record<string, { count: (args: { where: Record<string, any> }) => Promise<number> }>)[model];
    if (!modelClient || typeof modelClient.count !== 'function') {
      throw new Error(`Prisma model ${model} does not have count method`);
    }
    const result = await modelClient.count({ where });
    const duration = Date.now() - startTime;
    
    // Track metrics if PrometheusService is available
    if (this.prometheusService) {
      this.prometheusService.trackDbQuery(model, 'count', duration);
    }
    
    return result;
  }

  /**
   * Connection pool monitoring
   * AI Note: Returns connection pool stats for monitoring
   */
  async getConnectionStats(): Promise<{
    activeConnections: string;
    idleConnections: string;
    totalConnections: string;
  }> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ active: bigint; idle: bigint; total: bigint }>>(
        `SELECT
          COUNT(*) FILTER (WHERE state = 'active') AS active,
          COUNT(*) FILTER (WHERE state = 'idle') AS idle,
          COUNT(*) AS total
        FROM pg_stat_activity
        WHERE datname = current_database();`,
      );
      const stats = rows?.[0];
      return {
        activeConnections: stats?.active?.toString() ?? '0',
        idleConnections: stats?.idle?.toString() ?? '0',
        totalConnections: stats?.total?.toString() ?? '0',
      };
    } catch (error) {
      return {
        activeConnections: 'N/A',
        idleConnections: 'N/A',
        totalConnections: 'N/A',
      };
    }
  }
}

