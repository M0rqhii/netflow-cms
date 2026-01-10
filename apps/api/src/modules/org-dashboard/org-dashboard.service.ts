import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { BillingService } from '../billing/billing.service';
import { EnvironmentType, PageStatus } from '@prisma/client';
import { getPlanConfig } from '@repo/schemas';

export type DashboardRole = 'owner' | 'admin' | 'member';

export interface Alert {
  id: string;
  type: 'deployment_error' | 'missing_domain' | 'limit_exceeded' | 'policy_disabled' | 'billing_issue';
  severity: 'high' | 'medium' | 'low';
  message: string;
  siteId?: string;
  siteSlug?: string;
  actionUrl: string;
}

export interface SiteCard {
  id: string;
  slug: string;
  name: string;
  status: 'LIVE' | 'DRAFT' | 'ERROR';
  domain?: string;
  plan?: string;
  lastDeploy?: {
    time: string;
    status: 'success' | 'failed';
    message?: string;
  };
  alerts?: Alert[];
  quickActions: QuickAction[];
}

export interface QuickAction {
  label: string;
  url: string;
  capability?: string;
}

export interface BusinessInfo {
  plan: {
    name: string;
    limits: {
      maxPages: number;
      maxUsers: number;
      maxStorageMB: number;
    };
  };
  usage: {
    storage: {
      used: number;
      limit: number;
      percent: number;
    };
    apiRequests: {
      used: number;
      limit: number;
      percent: number;
    };
    bandwidth: {
      used: number;
      limit: number;
      percent: number;
    };
  };
  billing: {
    status: string;
    nextPayment?: string;
  };
}

export interface UsageInfo {
  storage: {
    used: number;
    limit: number;
    percent: number;
  };
  apiRequests: {
    used: number;
    limit: number;
    percent: number;
  };
  bandwidth: {
    used: number;
    limit: number;
    percent: number;
  };
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
  siteId?: string;
  siteSlug?: string;
}

export interface DashboardResponse {
  alerts: Alert[];
  business?: BusinessInfo;
  usage?: UsageInfo;
  sites: SiteCard[];
  activity?: ActivityItem[];
  quickAccess?: Array<{
    label: string;
    url: string;
  }>;
}

@Injectable()
export class OrgDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Get user's role in organization
   */
  async getUserRole(orgId: string, userId: string): Promise<DashboardRole> {
    // Check if user is Owner
    const assignments = await this.rbacService.getAssignments(orgId, userId);
    const hasOwnerRole = assignments.some(
      a => a.role.name === 'Org Owner' && a.role.type === 'SYSTEM' && a.role.scope === 'ORG'
    );

    if (hasOwnerRole) {
      return 'owner';
    }

    // Check if user is Admin
    const hasAdminRole = assignments.some(
      a => a.role.name === 'Org Admin' && a.role.type === 'SYSTEM' && a.role.scope === 'ORG'
    );

    if (hasAdminRole) {
      return 'admin';
    }

    // Otherwise, member
    return 'member';
  }

  /**
   * Get dashboard data for organization
   */
  async getDashboard(orgId: string, userId: string): Promise<DashboardResponse> {
    // Verify organization exists
    const org = await this.prisma.tenant.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, plan: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Get user role
    const role = await this.getUserRole(orgId, userId);

    // For now, we'll get all sites in the org (in real scenario, filter by user access)
    const sites = await this.prisma.tenant.findMany({
      where: {
        id: orgId, // For now, just the org itself as a site
      },
    });

    // Get alerts
    const alerts = await this.getAlerts(orgId, role);

    // Get sites with status and quick actions
    const sitesData = await Promise.all(
      sites.map(site => this.getSiteCard(orgId, site.id, userId))
    );

    const response: DashboardResponse = {
      alerts,
      sites: sitesData,
    };

    // Add business info for Owner
    if (role === 'owner') {
      response.business = await this.getBusinessInfo(orgId);
    }

    // Add usage info for Owner and Admin
    if (role === 'owner' || role === 'admin') {
      response.usage = await this.getUsageInfo(orgId);
    }

    // Add quick access for Admin
    if (role === 'admin') {
      response.quickAccess = [
        { label: 'Users', url: `/org/${orgId}/users` },
        { label: 'Roles', url: `/org/${orgId}/settings/roles` },
        { label: 'Policies', url: `/org/${orgId}/settings/policies` },
      ];
    }

    // Add activity for Owner (optional, can be lazy loaded)
    if (role === 'owner') {
      response.activity = await this.getActivity(orgId);
    }

    return response;
  }

  /**
   * Get alerts for organization
   */
  private async getAlerts(orgId: string, role: DashboardRole): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Get failed deployments in last 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const failedDeployments = await this.prisma.siteDeployment.findMany({
      where: {
        siteId: orgId,
        status: 'failed',
        createdAt: {
          gte: yesterday,
        },
      },
      include: {
        site: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    for (const deployment of failedDeployments) {
      alerts.push({
        id: `deploy-${deployment.id}`,
        type: 'deployment_error',
        severity: 'high',
        message: `Deploy strony ${deployment.site.name} nieudany: ${deployment.message || 'Unknown error'}`,
        siteId: deployment.siteId,
        siteSlug: deployment.site.slug,
        actionUrl: `/sites/${deployment.site.slug}/deployments`,
      });
    }

    // Get sites without custom domain (simplified - check if domain is set in settings)
    // For now, we'll skip this as it requires checking site settings

    // Get limit exceeded alerts (only for Owner)
    if (role === 'owner') {
      const org = await this.prisma.tenant.findUnique({
        where: { id: orgId },
        select: { plan: true },
      });

      if (org) {
        const planConfig = getPlanConfig(org.plan || 'free');
        if (planConfig?.limits) {
          // Check usage vs limits
          const usage = await this.getUsageInfo(orgId);
          
          if (usage.storage.percent >= 90) {
            alerts.push({
              id: 'limit-storage',
              type: 'limit_exceeded',
              severity: 'high',
              message: `Przekroczono limit storage: ${usage.storage.used}MB / ${usage.storage.limit}MB`,
              actionUrl: `/org/${orgId}/usage`,
            });
          }

          if (usage.apiRequests.percent >= 90) {
            alerts.push({
              id: 'limit-api',
              type: 'limit_exceeded',
              severity: 'medium',
              message: `Przekroczono limit API requests: ${usage.apiRequests.used} / ${usage.apiRequests.limit}`,
              actionUrl: `/org/${orgId}/usage`,
            });
          }
        }
      }
    }

    // Get disabled policies (important capabilities)
    const policies = await this.rbacService.getPolicies(orgId);
    const importantCapabilities = ['builder.rollback', 'builder.publish', 'content.delete'];
    
    for (const policy of policies) {
      if (!policy.enabled && importantCapabilities.includes(policy.capabilityKey)) {
        alerts.push({
          id: `policy-${policy.capabilityKey}`,
          type: 'policy_disabled',
          severity: 'medium',
          message: `Polityka ${policy.capabilityKey} wyłączona`,
          actionUrl: `/org/${orgId}/settings/policies`,
        });
      }
    }

    // Get billing issues (only for Owner)
    if (role === 'owner') {
      try {
        const subscription = await this.billingService.getTenantSubscription(orgId);
        if (subscription && subscription.status !== 'active') {
          alerts.push({
            id: 'billing-issue',
            type: 'billing_issue',
            severity: 'high',
            message: `Problemy z płatnością: ${subscription.status}`,
            actionUrl: `/org/${orgId}/billing`,
          });
        }
      } catch (error) {
        // Subscription might not exist, ignore
      }
    }

    // Sort by severity and limit to 5
    alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return alerts.slice(0, 5);
  }

  /**
   * Get site card with status and quick actions
   */
  private async getSiteCard(orgId: string, siteId: string, userId: string): Promise<SiteCard> {
    const site = await this.prisma.tenant.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Get site status
    const status = await this.getSiteStatus(siteId);

    // Get last deployment
    const lastDeploy = await this.prisma.siteDeployment.findFirst({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });

    // Get domain from settings (simplified)
    const domain = (site.settings as any)?.domain || undefined;

    // Get site-specific alerts
    const siteAlerts: Alert[] = [];
    if (lastDeploy && lastDeploy.status === 'failed') {
      const deployTime = new Date(lastDeploy.createdAt);
      const hoursAgo = (Date.now() - deployTime.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 24) {
        siteAlerts.push({
          id: `site-deploy-${lastDeploy.id}`,
          type: 'deployment_error',
          severity: 'high',
          message: `Ostatni deploy nieudany (${Math.round(hoursAgo)}h temu)`,
          siteId,
          siteSlug: site.slug,
          actionUrl: `/sites/${site.slug}/deployments`,
        });
      }
    }

    if (!domain) {
      siteAlerts.push({
        id: `site-domain-${siteId}`,
        type: 'missing_domain',
        severity: 'medium',
        message: 'Brak domeny',
        siteId,
        siteSlug: site.slug,
        actionUrl: `/sites/${site.slug}/settings`,
      });
    }

    // Get quick actions based on user capabilities
    const quickActions = await this.getQuickActions(orgId, siteId, userId);

    return {
      id: site.id,
      slug: site.slug,
      name: site.name,
      status,
      domain,
      plan: site.plan || undefined,
      lastDeploy: lastDeploy
        ? {
            time: lastDeploy.createdAt.toISOString(),
            status: lastDeploy.status as 'success' | 'failed',
            message: lastDeploy.message || undefined,
          }
        : undefined,
      alerts: siteAlerts.length > 0 ? siteAlerts : undefined,
      quickActions,
    };
  }

  /**
   * Get site status (LIVE, DRAFT, ERROR)
   */
  private async getSiteStatus(siteId: string): Promise<'LIVE' | 'DRAFT' | 'ERROR'> {
    // Check for ERROR (failed deploy in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const failedDeploy = await this.prisma.siteDeployment.findFirst({
      where: {
        siteId,
        status: 'failed',
        createdAt: {
          gte: weekAgo,
        },
      },
    });

    if (failedDeploy) {
      return 'ERROR';
    }

    // Check for LIVE (at least one published page in production)
    const productionEnv = await this.prisma.siteEnvironment.findFirst({
      where: {
        siteId: siteId,
        type: EnvironmentType.PRODUCTION,
      },
    });

    if (productionEnv) {
      const publishedPages = await this.prisma.page.findMany({
        where: {
          siteId: siteId,
          environmentId: productionEnv.id,
          status: PageStatus.PUBLISHED,
        },
        take: 1,
      });

      if (publishedPages.length > 0) {
        return 'LIVE';
      }
    }

    // Otherwise DRAFT
    return 'DRAFT';
  }

  /**
   * Get quick actions for site based on user capabilities
   */
  private async getQuickActions(orgId: string, siteId: string, userId: string): Promise<QuickAction[]> {
    const actions: QuickAction[] = [];

    // Check capabilities per action
    const canBuild = await this.rbacService.canUserPerform(orgId, userId, 'builder.edit', siteId);
    const canPublish = await this.rbacService.canUserPerform(orgId, userId, 'builder.publish', siteId);
    const canMarketing = await this.rbacService.canUserPerform(orgId, userId, 'marketing.view', siteId);
    const canSettings = await this.rbacService.canUserPerform(orgId, userId, 'sites.settings.view', siteId);

    const site = await this.prisma.tenant.findUnique({
      where: { id: siteId },
      select: { slug: true },
    });

    if (!site) {
      return actions;
    }

    if (canBuild) {
      actions.push({
        label: 'Build',
        url: `/sites/${site.slug}/panel/builder`,
        capability: 'builder.edit',
      });
    }

    if (canPublish) {
      actions.push({
        label: 'Publish',
        url: `/sites/${site.slug}/panel/deployments`,
        capability: 'builder.publish',
      });
    }

    if (canMarketing) {
      actions.push({
        label: 'Marketing',
        url: `/sites/${site.slug}/panel/marketing`,
        capability: 'marketing.view',
      });
    }

    if (canSettings) {
      actions.push({
        label: 'Settings',
        url: `/sites/${site.slug}/settings`,
        capability: 'sites.settings.view',
      });
    }

    return actions;
  }

  /**
   * Get business info (Owner only)
   */
  private async getBusinessInfo(orgId: string): Promise<BusinessInfo> {
    const org = await this.prisma.tenant.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const planConfig = getPlanConfig(org.plan || 'free');
    const usage = await this.getUsageInfo(orgId);

    // Get subscription
    let billingStatus = 'active';
    let nextPayment: string | undefined;
    try {
      const subscription = await this.billingService.getTenantSubscription(orgId);
      if (subscription) {
        billingStatus = subscription.status;
        if (subscription.currentPeriodEnd) {
          nextPayment = subscription.currentPeriodEnd.toISOString();
        }
      }
    } catch (error) {
      // Subscription might not exist
    }

    return {
      plan: {
        name: planConfig?.name || 'Free',
        limits: {
          maxPages: planConfig?.limits?.maxPages || -1,
          maxUsers: planConfig?.limits?.maxUsers || -1,
          maxStorageMB: planConfig?.limits?.maxStorageMB || -1,
        },
      },
      usage,
      billing: {
        status: billingStatus,
        nextPayment,
      },
    };
  }

  /**
   * Get usage info
   */
  private async getUsageInfo(orgId: string): Promise<UsageInfo> {
    // Get plan limits
    const org = await this.prisma.tenant.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    const planConfig = getPlanConfig(org?.plan || 'free');
    const limits = planConfig?.limits || {};

    // Get actual usage (simplified - in real scenario, aggregate from UsageTracking)
    const storageUsed = 0; // TODO: aggregate from UsageTracking
    const apiRequestsUsed = 0; // TODO: aggregate from UsageTracking
    const bandwidthUsed = 0; // TODO: aggregate from UsageTracking

    const storageLimit = limits.maxStorageMB || -1;
    const apiRequestsLimit = limits.maxApiRequestsPerMonth || -1;
    const bandwidthLimit = -1; // Not tracked in limits yet

    return {
      storage: {
        used: storageUsed,
        limit: storageLimit,
        percent: storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0,
      },
      apiRequests: {
        used: apiRequestsUsed,
        limit: apiRequestsLimit,
        percent: apiRequestsLimit > 0 ? Math.round((apiRequestsUsed / apiRequestsLimit) * 100) : 0,
      },
      bandwidth: {
        used: bandwidthUsed,
        limit: bandwidthLimit,
        percent: bandwidthLimit > 0 ? Math.round((bandwidthUsed / bandwidthLimit) * 100) : 0,
      },
    };
  }

  /**
   * Get activity (Owner only, optional)
   */
  private async getActivity(orgId: string): Promise<ActivityItem[]> {
    // Get recent site events
    const events = await this.prisma.siteEvent.findMany({
      where: { siteId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        site: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    return events.map(event => ({
      id: event.id,
      type: event.type,
      message: event.message,
      time: event.createdAt.toISOString(),
      siteId: event.siteId,
      siteSlug: event.site.slug,
    }));
  }
}

