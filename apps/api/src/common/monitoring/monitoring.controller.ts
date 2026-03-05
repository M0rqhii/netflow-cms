import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/roles.enum';

/**
 * Monitoring Controller
 * Provides endpoints for viewing performance metrics
 *
 * Note: Only accessible to users with SYSTEM_ACCESS permission (super_admin, system roles)
 */
@Controller('monitoring')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions(Permission.SYSTEM_ACCESS)
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Get('metrics')
  getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('cache')
  getCacheStats() {
    const metrics = this.monitoringService.getMetrics();
    return {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      hitRate: metrics.cache.hitRate,
    };
  }

  @Get('queries')
  getQueryMetrics() {
    return this.monitoringService.getQueryMetrics();
  }
}

