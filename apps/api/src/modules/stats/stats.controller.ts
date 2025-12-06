import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Role } from '../../common/auth/roles.enum';

/**
 * StatsController - RESTful API for platform statistics
 * AI Note: Provides quick stats endpoint for dashboard
 */
@Controller('stats')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * Get quick statistics for the platform
   * GET /api/v1/stats/quick
   */
  @Get('quick')
  async getQuickStats() {
    return this.statsService.getQuickStats();
  }
}

