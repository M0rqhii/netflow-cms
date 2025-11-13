import { Module, Global } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
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
  controllers: [MonitoringController],
  providers: [MonitoringService, PrismaService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

