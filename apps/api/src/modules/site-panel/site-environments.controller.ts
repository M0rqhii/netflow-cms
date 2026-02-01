import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { FeatureFlagGuard } from '../../common/auth/guards/feature-flag.guard';
import { SiteGuard } from '../../common/org-site/site.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { FeatureKey } from '../../common/decorators/feature-key.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { SiteEnvironmentsService } from './site-environments.service';
import { CreateSiteEnvironmentDtoSchema } from './dto';

@UseGuards(AuthGuard, SiteGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/environments')
export class SiteEnvironmentsController {
  constructor(private readonly environments: SiteEnvironmentsService) {}

  private assertSiteScope(routeSiteId: string, currentSiteId: string) {
    if (routeSiteId !== currentSiteId) {
      throw new ForbiddenException('Cross-site access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(@Param('siteId') siteId: string, @CurrentSite() currentSiteId: string) {
    this.assertSiteScope(siteId, currentSiteId);
    return this.environments.list(currentSiteId);
  }

  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.ENVIRONMENTS_MANAGE)
  create(
    @Param('siteId') siteId: string,
    @CurrentSite() currentSiteId: string,
    @Body(new ZodValidationPipe(CreateSiteEnvironmentDtoSchema)) body: any,
  ) {
    this.assertSiteScope(siteId, currentSiteId);
    return this.environments.create(currentSiteId, body as any);
  }
}
