import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { SiteSeoService } from './site-seo.service';
import { UpdateSeoSettingsDtoSchema } from './dto';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/seo')
export class SiteSeoController {
  constructor(private readonly siteSeo: SiteSeoService) {}

  @Get()
  @Permissions(Permission.PAGES_READ)
  getSeoSettings(@Param('siteId') siteId: string, @CurrentSite() _: string) {
    return this.siteSeo.getSettings(siteId);
  }

  @Patch()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.PAGES_WRITE)
  updateSeoSettings(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdateSeoSettingsDtoSchema)) body: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.siteSeo.updateSettings(siteId, body as any, user?.id);
  }
}
