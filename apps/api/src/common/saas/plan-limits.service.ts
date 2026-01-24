import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Plan Limits Service
 * AI Note: Manages resource limits per plan (free, professional, enterprise)
 * Integrates with UsageTracking for billing and monitoring
 */
@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan limits configuration
   * Note: Infinity is represented as -1 in database queries
   */
  private readonly PLAN_LIMITS = {
    free: {
      collections: 5,
      contentTypes: 10,
      mediaFiles: 100,
      storageMB: 100,
      users: 3,
      webhooks: 5,
      apiRequestsPerMonth: 10000,
    },
    professional: {
      collections: 50,
      contentTypes: 100,
      mediaFiles: 1000,
      storageMB: 1000,
      users: 20,
      webhooks: 50,
      apiRequestsPerMonth: 100000,
    },
    enterprise: {
      collections: -1, // Infinity
      contentTypes: -1,
      mediaFiles: -1,
      storageMB: -1,
      users: -1,
      webhooks: -1,
      apiRequestsPerMonth: -1,
    },
  } as const;

  /**
   * Get limits for a plan
   */
  getLimits(plan: 'free' | 'professional' | 'enterprise') {
    return this.PLAN_LIMITS[plan];
  }

  /**
   * Check if organization can create a resource
   */
  async canCreateResource(
    orgId: string,
    resourceType: 'collection' | 'contentType' | 'mediaFile' | 'user' | 'webhook',
    siteId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const plan = organization.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);

    // Check current usage
    const counts = await this.getResourceCounts(orgId, siteId);
    const limit = limits[this.getLimitKey(resourceType)];

    // -1 represents Infinity
    if (limit === -1) {
      return { allowed: true };
    }

    const current = counts[resourceType];
    if (current >= limit) {
      return {
        allowed: false,
        reason: `Plan limit reached: ${current}/${limit} ${resourceType}s`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if organization can use storage (in MB)
   */
  async canUseStorage(
    orgId: string,
    additionalMB: number,
    siteId?: string,
  ): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const plan = organization.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);
    const limit = limits.storageMB;

    if (limit === -1) {
      return { allowed: true };
    }

    const currentUsage = await this.getStorageUsage(orgId, siteId);
    const newUsage = currentUsage + additionalMB;

    if (newUsage > limit) {
      return {
        allowed: false,
        reason: `Storage limit exceeded: ${newUsage}MB/${limit}MB`,
        currentUsage,
        limit,
      };
    }

    return { allowed: true, currentUsage, limit };
  }

  /**
   * Track resource usage for billing
   */
  async trackUsage(
    orgId: string,
    resourceType: 'collections' | 'contentTypes' | 'mediaFiles' | 'users' | 'storageMB' | 'apiRequests',
    count: number = 1,
  ): Promise<void> {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    await (this.prisma as any).usageTracking.upsert({
      where: {
        orgId_resourceType_period: {
          orgId,
          resourceType,
          period,
        },
      },
      update: {
        count: { increment: count },
        updatedAt: new Date(),
      },
      create: {
        orgId,
        resourceType,
        count,
        period,
      },
    });
  }

  /**
   * Get usage for a specific period
   */
  async getUsageForPeriod(
    orgId: string,
    period: string, // YYYY-MM format
  ): Promise<Record<string, number>> {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const usageRecords = await (this.prisma as any).usageTracking.findMany({
      where: {
        orgId,
        period,
      },
    });

    return usageRecords.reduce(
      (acc: Record<string, number>, record: { resourceType: string; count: number }) => {
        acc[record.resourceType] = record.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get current resource counts for an organization
   */
  async getResourceCounts(orgId: string, siteId?: string) {
    const siteFilter = siteId ? { siteId } : { site: { orgId } };
    const [collections, contentTypes, mediaFiles, users, webhooks] = await Promise.all([
      this.prisma.collection.count({ where: siteFilter }),
      this.prisma.contentType.count({ where: siteFilter }),
      this.prisma.mediaItem.count({ where: siteFilter }),
      this.prisma.user.count({ where: { orgId } }),
      this.prisma.webhook.count({ where: siteFilter }),
    ]);

    return {
      collection: collections,
      contentType: contentTypes,
      mediaFile: mediaFiles,
      user: users,
      webhook: webhooks,
    };
  }

  /**
   * Get current storage usage in MB
   */
  async getStorageUsage(orgId: string, siteId?: string): Promise<number> {
    const siteFilter = siteId ? { siteId } : { site: { orgId } };
    const result = await this.prisma.mediaItem.aggregate({
      where: siteFilter,
      _sum: {
        size: true,
      },
    });

    const bytes = result._sum.size || 0;
    return Math.ceil(bytes / (1024 * 1024)); // Convert to MB
  }

  /**
   * Get subscription status for organization
   */
  async getSubscriptionStatus(orgId: string): Promise<{
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
    isActive: boolean;
  }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const subscription = await (this.prisma as any).subscription.findFirst({
      where: {
        orgId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      plan: organization.plan,
      status: subscription?.status || 'inactive',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
    };
  }

  /**
   * Get limits and usage summary for organization
   */
  async getLimitsAndUsage(orgId: string, siteId?: string): Promise<{
    plan: string;
    limits: Record<string, number>;
    usage: Record<string, number>;
    storageUsageMB: number;
  }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const plan = organization.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);
    const counts = await this.getResourceCounts(orgId, siteId);
    const storageUsageMB = await this.getStorageUsage(orgId, siteId);

    return {
      plan,
      limits: {
        collections: limits.collections === -1 ? Infinity : limits.collections,
        contentTypes: limits.contentTypes === -1 ? Infinity : limits.contentTypes,
        mediaFiles: limits.mediaFiles === -1 ? Infinity : limits.mediaFiles,
        storageMB: limits.storageMB === -1 ? Infinity : limits.storageMB,
        users: limits.users === -1 ? Infinity : limits.users,
        webhooks: limits.webhooks === -1 ? Infinity : limits.webhooks,
        apiRequestsPerMonth: limits.apiRequestsPerMonth === -1 ? Infinity : limits.apiRequestsPerMonth,
      },
      usage: {
        collections: counts.collection,
        contentTypes: counts.contentType,
        mediaFiles: counts.mediaFile,
        storageMB: storageUsageMB,
        users: counts.user,
        webhooks: counts.webhook,
      },
      storageUsageMB,
    };
  }

  private getLimitKey(resourceType: string): keyof typeof this.PLAN_LIMITS.free {
    const mapping: Record<string, keyof typeof this.PLAN_LIMITS.free> = {
      collection: 'collections',
      contentType: 'contentTypes',
      mediaFile: 'mediaFiles',
      user: 'users',
      webhook: 'webhooks',
    };
    return mapping[resourceType] || 'collections';
  }
}
