import { Module, Global } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { PrometheusService } from './prometheus.service';
import { PrometheusController } from './prometheus.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Global Monitoring Module
 * Provides performance monitoring and metrics tracking
 */
@Global()
@Module({
  imports: [CacheModule, AuthModule],
  controllers: [MonitoringController, PrometheusController],
  providers: [MonitoringService, PrometheusService, PrismaService],
  exports: [MonitoringService, PrometheusService],
})
export class MonitoringModule {}

