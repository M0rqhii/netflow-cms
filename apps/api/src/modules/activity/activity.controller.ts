import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Role } from '../../common/auth/roles.enum';

/**
 * ActivityController - RESTful API for activity feed
 * AI Note: Provides activity endpoint for dashboard
 */
@Controller('activity')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get activity feed
   * GET /api/v1/activity?limit=10
   */
  @Get()
  async getActivity(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activityService.getActivity(limitNum);
  }
}

