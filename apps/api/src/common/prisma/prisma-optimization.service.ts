import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma Optimization Service
 * AI Note: Provides optimized database queries and connection pooling
 */
@Injectable()
export class PrismaOptimizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Optimized findMany with select only needed fields
   * AI Note: Reduces data transfer by selecting only required fields
   */
  async findManyOptimized<T>(
    model: string,
    where: any,
    select?: Record<string, boolean>,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
    },
  ): Promise<T[]> {
    const query: any = {
      where,
      ...(select && { select }),
      ...(options?.skip && { skip: options.skip }),
      ...(options?.take && { take: options.take }),
      ...(options?.orderBy && { orderBy: options.orderBy }),
    };

    // Use Prisma's select to reduce data transfer
    return (this.prisma as any)[model].findMany(query);
  }

  /**
   * Optimized findUnique with select only needed fields
   */
  async findUniqueOptimized<T>(
    model: string,
    where: any,
    select?: Record<string, boolean>,
  ): Promise<T | null> {
    const query: any = {
      where,
      ...(select && { select }),
    };

    return (this.prisma as any)[model].findUnique(query);
  }

  /**
   * Batch operations for better performance
   * AI Note: Groups multiple operations into a single transaction
   */
  async batchOperation<T>(
    operations: Array<() => Promise<T>>,
  ): Promise<T[]> {
    return this.prisma.$transaction(
      operations.map((op) => op()),
      {
        maxWait: 5000, // Maximum time to wait for a transaction slot
        timeout: 10000, // Maximum time for the transaction to complete
      },
    );
  }

  /**
   * Optimized count with where clause
   */
  async countOptimized(model: string, where: any): Promise<number> {
    return (this.prisma as any)[model].count({ where });
  }

  /**
   * Connection pool monitoring
   * AI Note: Returns connection pool stats for monitoring
   */
  async getConnectionStats() {
    // Prisma doesn't expose connection pool stats directly
    // This is a placeholder for future implementation
    return {
      activeConnections: 'N/A',
      idleConnections: 'N/A',
      totalConnections: 'N/A',
    };
  }
}

