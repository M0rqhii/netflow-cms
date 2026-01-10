import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health Module
 * Provides health check indicators for database, Redis, memory, and disk
 */
@Module({
  imports: [TerminusModule],
  providers: [RedisHealthIndicator, DatabaseHealthIndicator, PrismaService],
  exports: [RedisHealthIndicator, DatabaseHealthIndicator],
})
export class HealthModule {}
