import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { Role } from '../../common/auth/roles.enum';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureOverrideDtoSchema } from './dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * FeatureFlagsController - RESTful API for feature flags management
 * AI Note: Only accessible to platform admins (super_admin, org admin role)
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('sites/:siteId/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * GET /sites/:siteId/features
   * Get all features for a site (plan features, overrides, and effective features)
   */
  @Get()
  @Throttle(300, 60) // 300 requests per minute (higher limit for feature flag checks)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async getSiteFeatures(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
  ) {
    return this.featureFlagsService.getSiteFeatures(siteId);
  }

  /**
   * PATCH /sites/:siteId/features/override
   * Create or update a feature override for a site
   */
  @Patch('override')
  @Throttle(50, 60) // 50 requests per minute (lower limit for write operations)
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN) // Allow org admins to manage site modules
  async setFeatureOverride(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Body(new ZodValidationPipe(FeatureOverrideDtoSchema)) dto: any,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.featureFlagsService.setFeatureOverride(siteId, dto as any);
  }
}








