import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { SiteEventsService } from './site-events.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/events')
export class SiteEventsController {
  constructor(private readonly events: SiteEventsService) {}

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.events.list(siteId, Number.isFinite(parsedLimit) ? parsedLimit : 100);
  }
}
