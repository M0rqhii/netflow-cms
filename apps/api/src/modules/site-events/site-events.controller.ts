import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { SiteEventsService } from './site-events.service';

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/events')
export class SiteEventsController {
  constructor(private readonly events: SiteEventsService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    this.assertTenantScope(siteId, tenantId);
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.events.list(siteId, Number.isFinite(parsedLimit) ? parsedLimit : 100);
  }
}
