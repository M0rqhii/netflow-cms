import { Body, Controller, ForbiddenException, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { SiteSeoService } from './site-seo.service';
import { UpdateSeoSettingsDtoSchema } from './dto';

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/seo')
export class SiteSeoController {
  constructor(private readonly siteSeo: SiteSeoService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  getSeoSettings(@Param('siteId') siteId: string, @CurrentTenant() tenantId: string) {
    this.assertTenantScope(siteId, tenantId);
    return this.siteSeo.getSettings(tenantId);
  }

  @Patch()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.PAGES_WRITE)
  updateSeoSettings(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdateSeoSettingsDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.siteSeo.updateSettings(tenantId, body as any, user?.id);
  }
}
