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
   * Check if tenant can create a resource
   */
  async canCreateResource(
    tenantId: string,
    resourceType: 'collection' | 'contentType' | 'mediaFile' | 'user' | 'webhook',
  ): Promise<{ allowed: boolean; reason?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return { allowed: false, reason: 'Tenant not found' };
    }

    const plan = tenant.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);

    // Check current usage
    const counts = await this.getResourceCounts(tenantId);
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
   * Check if tenant can use storage (in MB)
   */
  async canUseStorage(
    tenantId: string,
    additionalMB: number,
  ): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return { allowed: false, reason: 'Tenant not found' };
    }

    const plan = tenant.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);
    const limit = limits.storageMB;

    if (limit === -1) {
      return { allowed: true };
    }

    const currentUsage = await this.getStorageUsage(tenantId);
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
    tenantId: string,
    resourceType: 'collections' | 'contentTypes' | 'mediaFiles' | 'users' | 'storageMB' | 'apiRequests',
    count: number = 1,
  ): Promise<void> {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    await (this.prisma as any).usageTracking.upsert({
      where: {
        tenantId_resourceType_period: {
          tenantId,
          resourceType,
          period,
        },
      },
      update: {
        count: { increment: count },
        updatedAt: new Date(),
      },
      create: {
        tenantId,
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
    tenantId: string,
    period: string, // YYYY-MM format
  ): Promise<Record<string, number>> {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const usageRecords = await (this.prisma as any).usageTracking.findMany({
      where: {
        tenantId,
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
   * Get current resource counts for a tenant
   */
  async getResourceCounts(tenantId: string) {
    const [collections, contentTypes, mediaFiles, users, webhooks] = await Promise.all([
      this.prisma.collection.count({ where: { tenantId } }),
      this.prisma.contentType.count({ where: { tenantId } }),
      this.prisma.mediaFile.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.webhook.count({ where: { tenantId } }),
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
  async getStorageUsage(tenantId: string): Promise<number> {
    const result = await this.prisma.mediaFile.aggregate({
      where: { tenantId },
      _sum: {
        size: true,
      },
    });

    const bytes = result._sum.size || 0;
    return Math.ceil(bytes / (1024 * 1024)); // Convert to MB
  }

  /**
   * Get subscription status for tenant
   */
  async getSubscriptionStatus(tenantId: string): Promise<{
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
    isActive: boolean;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const subscription = await (this.prisma as any).subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      plan: tenant.plan,
      status: subscription?.status || 'inactive',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
    };
  }

  /**
   * Get limits and usage summary for tenant
   */
  async getLimitsAndUsage(tenantId: string): Promise<{
    plan: string;
    limits: Record<string, number>;
    usage: Record<string, number>;
    storageUsageMB: number;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const plan = tenant.plan as 'free' | 'professional' | 'enterprise';
    const limits = this.getLimits(plan);
    const counts = await this.getResourceCounts(tenantId);
    const storageUsageMB = await this.getStorageUsage(tenantId);

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

