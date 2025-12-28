import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '../../common/auth/roles.enum';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureOverrideDtoSchema } from './dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * FeatureFlagsController - RESTful API for feature flags management
 * AI Note: Only accessible to platform admins (super_admin, tenant_admin)
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('sites/:siteId/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  /**
   * GET /sites/:siteId/features
   * Get all features for a site (plan features, overrides, and effective features)
   */
  @Get()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async getSiteFeatures(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.featureFlagsService.getSiteFeatures(siteId);
  }

  /**
   * PATCH /sites/:siteId/features/override
   * Create or update a feature override for a site
   */
  @Patch('override')
  @Roles(Role.SUPER_ADMIN) // Only super_admin can override features
  async setFeatureOverride(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(FeatureOverrideDtoSchema)) dto: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.featureFlagsService.setFeatureOverride(siteId, dto as any);
  }
}





