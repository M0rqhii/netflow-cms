import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

/**
 * Monitoring Controller
 * Provides endpoints for viewing performance metrics
 * 
 * Note: Only accessible to super_admin users
 */
@Controller('monitoring')
@UseGuards(AuthGuard)
@Roles(Role.SUPER_ADMIN)
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

