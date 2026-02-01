import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  getPlanFeatures,
  getPlanConfig,
  getPlanLimits,
  getBuilderModuleDependencies,
  getBuilderModuleDependents,
  isBuilderModuleKey,
} from '@repo/schemas';
import { FeatureOverrideDto } from './dto';
import { AuditLoggerService, AuditEventType } from '../../common/audit/audit-logger.service';

/**
 * FeatureFlagsService - Business logic for feature flags and plan-based features
 * AI Note: Handles plan features, site overrides, and effective feature calculation
 */
@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Validate plan name (fallback if isValidPlan is not available)
   */
  private isValidPlan(plan: string | null | undefined): boolean {
    if (!plan) return false;
    const validPlans = ['free', 'basic', 'professional', 'pro', 'enterprise', 'BASIC', 'PRO'];
    return validPlans.includes(plan);
  }

  /**
   * Get features for a plan
   */
  getPlanFeatures(plan: string | null | undefined): string[] {
    if (!this.isValidPlan(plan)) {
      return [];
    }
    try {
      return getPlanFeatures(plan || 'free');
    } catch (error) {
      return [];
    }
  }

  /**
   * Get plan configuration
   */
  getPlanConfig(plan: string | null | undefined) {
    if (!this.isValidPlan(plan)) {
      return null;
    }
    try {
      return getPlanConfig(plan || 'free');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get plan limits
   */
  getPlanLimits(plan: string | null | undefined) {
    if (!this.isValidPlan(plan)) {
      return null;
    }
    try {
      return getPlanLimits(plan || 'free');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all overrides for a site
   */
  async getOverrides(siteId: string) {
    return this.prisma.siteFeatureOverride.findMany({
      where: { siteId },
      select: {
        id: true,
        featureKey: true,
        enabled: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get effective features for a site (plan features + overrides)
   */
  async getEffectiveFeatures(siteId: string): Promise<string[]> {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: site.orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${site.orgId} not found`);
    }

    // Get plan features
    const planFeatures = this.getPlanFeatures(organization.plan);

    // Get overrides
    const overrides = await this.getOverrides(siteId);
    const overrideMap = new Map<string, boolean>();
    overrides.forEach((override) => {
      overrideMap.set(override.featureKey, override.enabled);
    });

    // Calculate effective features
    const effectiveFeatures = new Set<string>();

    // Start with plan features
    planFeatures.forEach((feature) => {
      // If there's an override, use it; otherwise use plan default
      if (overrideMap.has(feature)) {
        if (overrideMap.get(feature)) {
          effectiveFeatures.add(feature);
        }
        // If override is false, don't add (even if in plan)
      } else {
        // No override, use plan default (always enabled if in plan)
        effectiveFeatures.add(feature);
      }
    });

    // Add features that are enabled via override but not in plan
    overrideMap.forEach((enabled, featureKey) => {
      if (enabled && !planFeatures.includes(featureKey)) {
        effectiveFeatures.add(featureKey);
      }
    });

    return Array.from(effectiveFeatures);
  }

  /**
   * Check if a specific feature is enabled for a site
   */
  async isFeatureEnabled(siteId: string, featureKey: string): Promise<boolean> {
    const effectiveFeatures = await this.getEffectiveFeatures(siteId);
    return effectiveFeatures.includes(featureKey);
  }

  /**
   * Set or update a feature override for a site
   */
  async setFeatureOverride(siteId: string, dto: FeatureOverrideDto) {
    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, orgId: true },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: site.orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${site.orgId} not found`);
    }

    const planFeatures = this.getPlanFeatures(organization.plan);
    const inPlan = planFeatures.includes(dto.featureKey);

    if (dto.enabled && !inPlan) {
      throw new BadRequestException(`Feature ${dto.featureKey} is not available in plan ${organization.plan}`);
    }

    const effectiveFeatures = await this.getEffectiveFeatures(siteId);

    if (!dto.enabled && isBuilderModuleKey(dto.featureKey)) {
      const dependents = getBuilderModuleDependents(dto.featureKey);
      const enabledDependents = dependents.filter((dep) => effectiveFeatures.includes(dep));
      if (enabledDependents.length > 0) {
        throw new BadRequestException(
          `Disable dependent modules first: ${enabledDependents.join(', ')}`
        );
      }
    }

    if (dto.enabled && isBuilderModuleKey(dto.featureKey)) {
      const deps = getBuilderModuleDependencies(dto.featureKey);
      const missingDeps = deps.filter((dep) => !effectiveFeatures.includes(dep));

      for (const dep of missingDeps) {
        if (!planFeatures.includes(dep)) {
          throw new BadRequestException(`Dependency ${dep} is not available in plan ${organization.plan}`);
        }
        const depOverride = await this.prisma.siteFeatureOverride.upsert({
          where: {
            siteId_featureKey: {
              siteId,
              featureKey: dep,
            },
          },
          create: {
            siteId,
            featureKey: dep,
            enabled: true,
          },
          update: {
            enabled: true,
          },
        });
        this.auditLogger.log(AuditEventType.SITE_MODULE_ENABLED, {
          orgId: site.orgId,
          siteId,
          resourceType: 'feature',
          resourceId: depOverride.id,
          action: 'enable',
          changes: { featureKey: dep, enabled: true, dependencyOf: dto.featureKey },
        });
      }
    }

    const result = await this.prisma.siteFeatureOverride.upsert({
      where: {
        siteId_featureKey: {
          siteId,
          featureKey: dto.featureKey,
        },
      },
      create: {
        siteId,
        featureKey: dto.featureKey,
        enabled: dto.enabled,
      },
      update: {
        enabled: dto.enabled,
      },
      select: {
        id: true,
        featureKey: true,
        enabled: true,
        createdAt: true,
      },
    });

    this.auditLogger.log(
      dto.enabled ? AuditEventType.SITE_MODULE_ENABLED : AuditEventType.SITE_MODULE_DISABLED,
      {
        orgId: site.orgId,
        siteId,
        resourceType: 'feature',
        resourceId: result.id,
        action: dto.enabled ? 'enable' : 'disable',
        changes: { featureKey: dto.featureKey, enabled: dto.enabled },
      }
    );

    return result;
  }

  /**
   * Remove a feature override (revert to plan default)
   */
  async removeFeatureOverride(siteId: string, featureKey: string) {
    return this.prisma.siteFeatureOverride.delete({
      where: {
        siteId_featureKey: {
          siteId,
          featureKey,
        },
      },
    });
  }

  /**
   * Get complete feature status for a site
   */
  async getSiteFeatures(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: site.orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${site.orgId} not found`);
    }

    const planFeatures = this.getPlanFeatures(organization.plan);
    const overrides = await this.getOverrides(siteId);
    const effective = await this.getEffectiveFeatures(siteId);
    const limits = this.getPlanLimits(organization.plan);

    return {
      plan: organization.plan,
      planFeatures,
      overrides: overrides.map((o) => ({
        featureKey: o.featureKey,
        enabled: o.enabled,
        createdAt: o.createdAt,
      })),
      effective,
      limits,
    };
  }
}
