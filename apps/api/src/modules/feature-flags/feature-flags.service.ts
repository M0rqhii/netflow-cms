import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  getPlanFeatures,
  getPlanConfig,
} from '@repo/schemas';
import { FeatureOverrideDto } from './dto';

/**
 * FeatureFlagsService - Business logic for feature flags and plan-based features
 * AI Note: Handles plan features, site overrides, and effective feature calculation
 */
@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

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
    // Get tenant to determine plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: siteId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // Get plan features
    const planFeatures = this.getPlanFeatures(tenant.plan);

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
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: siteId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // Upsert override
    return this.prisma.siteFeatureOverride.upsert({
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
    // Get tenant to determine plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: siteId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const planFeatures = this.getPlanFeatures(tenant.plan);
    const overrides = await this.getOverrides(siteId);
    const effective = await this.getEffectiveFeatures(siteId);

    return {
      plan: tenant.plan,
      planFeatures,
      overrides: overrides.map((o) => ({
        featureKey: o.featureKey,
        enabled: o.enabled,
        createdAt: o.createdAt,
      })),
      effective,
    };
  }
}








