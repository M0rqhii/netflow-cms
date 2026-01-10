import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';

/**
 * ActivityController - RESTful API for activity feed
 * AI Note: Provides activity endpoint for dashboard with role-based filtering
 */
@Controller('activity')
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get activity feed
   * GET /api/v1/activity?limit=10&orgId=xxx&siteId=xxx
   * 
   * Role-based filtering:
   * - Super admin: all logs
   * - Org owner/admin: all org logs or specific site logs
   * - Org member with site role: only their site logs
   * - Org member without site role: no logs
   */
  @Get()
  async getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('siteId') siteId?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activityService.getActivity(limitNum, user, orgId, siteId);
  }
}









