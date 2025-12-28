import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { OrgDashboardService } from './org-dashboard.service';

/**
 * Org Dashboard Controller
 * 
 * Provides dashboard data for organization with role-based filtering
 */
@UseGuards(AuthGuard, TenantGuard)
@Controller('orgs/:orgId/dashboard')
export class OrgDashboardController {
  constructor(private readonly dashboardService: OrgDashboardService) {}

  /**
   * GET /orgs/:orgId/dashboard
   * Get dashboard data for organization
   * 
   * Returns different data based on user role:
   * - Owner: alerts + business + usage + sites + activity
   * - Admin: alerts + usage + sites + quickAccess
   * - Member: sites only
   */
  @Get()
  async getDashboard(
    @Param('orgId') orgId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dashboardService.getDashboard(orgId, user.id);
  }
}

