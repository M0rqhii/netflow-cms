import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { SiteEnvironmentsService } from './site-environments.service';
import { CreateSiteEnvironmentDtoSchema } from './dto';

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/environments')
export class SiteEnvironmentsController {
  constructor(private readonly environments: SiteEnvironmentsService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(@Param('siteId') siteId: string, @CurrentTenant() tenantId: string) {
    this.assertTenantScope(siteId, tenantId);
    return this.environments.list(tenantId);
  }

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.ENVIRONMENTS_MANAGE)
  create(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateSiteEnvironmentDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.environments.create(tenantId, body as any);
  }
}
