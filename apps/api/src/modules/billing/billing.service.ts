import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentProvider } from '../../common/providers/interfaces/payment-provider.interface';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionQueryDto,
  InvoiceQueryDto,
  PaymentQueryDto,
  UpdateSiteSubscriptionDto,
} from './dto';

/**
 * BillingService - Service do zarzadzania billingiem, subskrypcjami, fakturami i platnosciami
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('PaymentProvider') private readonly paymentProvider: PaymentProvider,
  ) {}

  private calculatePeriodEnd(trialDays?: number): Date {
    const end = new Date();
    const daysToAdd = trialDays ?? 30;
    end.setDate(end.getDate() + daysToAdd);
    return end;
  }

  private normalizeValue(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private toDisplayPlan(plan: string | null | undefined): 'BASIC' | 'PRO' {
    const normalized = this.normalizeValue(plan);
    if (normalized === 'pro' || normalized === 'professional' || normalized === 'enterprise') {
      return 'PRO';
    }
    return 'BASIC';
  }

  private toDisplayStatus(status: string | null | undefined, plan: 'BASIC' | 'PRO'): string {
    const normalized = this.normalizeValue(status);
    if (normalized.length > 0) {
      return status as string;
    }
    return plan === 'PRO' ? 'active' : 'none';
  }

  private async getPrivilegedOrgSet(orgIds: string[]): Promise<Set<string>> {
    if (orgIds.length === 0) {
      return new Set<string>();
    }

    const [privilegedUsers, privilegedMemberships, privilegedOrganizations] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          orgId: { in: orgIds },
          OR: [
            { platformRole: 'platform_admin' },
            { role: 'platform_admin' },
          ],
        },
        select: { orgId: true },
        distinct: ['orgId'],
      }),
      this.prisma.userOrg.findMany({
        where: {
          orgId: { in: orgIds },
          role: 'platform_admin',
        },
        select: { orgId: true },
        distinct: ['orgId'],
      }),
      this.prisma.organization.findMany({
        where: {
          id: { in: orgIds },
          OR: [
            { slug: { equals: 'platform_admin', mode: 'insensitive' } },
            { name: { equals: 'platform_admin', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
    ]);

    const privilegedOrgSet = new Set<string>();
    privilegedUsers.forEach((item) => privilegedOrgSet.add(item.orgId));
    privilegedMemberships.forEach((item) => privilegedOrgSet.add(item.orgId));
    privilegedOrganizations.forEach((item) => privilegedOrgSet.add(item.id));
    return privilegedOrgSet;
  }

  private async hasPlatformAdmin(orgId: string): Promise<boolean> {
    const privilegedOrgSet = await this.getPrivilegedOrgSet([orgId]);
    return privilegedOrgSet.has(orgId);
  }

  /**
   * Get subscription for organization by id
   */
  async getSubscription(orgId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        orgId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * List subscriptions for organization
   */
  async listSubscriptions(orgId: string, query: SubscriptionQueryDto) {
    const { status, plan, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      orgId,
    };

    if (status) {
      where.status = status;
    }

    if (plan) {
      where.plan = plan;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Create subscription
   * Uses PaymentProvider to create subscription (provider handles DB persistence)
   */
  async createSubscription(orgId: string, dto: CreateSubscriptionDto) {
    if (!dto.plan) {
      throw new BadRequestException('Plan is required');
    }

    const result = await this.paymentProvider.createSubscription({
      orgId: orgId, // PaymentProvider still uses orgId internally (backward compatibility)
      plan: dto.plan,
      customerId: dto.stripeCustomerId,
      trialDays: dto.trialDays,
    });

    // Fetch the created subscription from DB to return full details
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: result.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found after creation');
    }

    return subscription;
  }

  /**
   * Update subscription
   * Uses PaymentProvider to update subscription
   */
  async updateSubscription(orgId: string, subscriptionId: string, dto: UpdateSubscriptionDto) {
    // Verify subscription belongs to organization
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        orgId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Use PaymentProvider to update
    await this.paymentProvider.updateSubscription({
      subscriptionId,
      plan: dto.plan,
      cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
    });

    // Fetch updated subscription
    return this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
  }

  /**
   * Cancel subscription
   * Uses PaymentProvider to cancel subscription
   */
  async cancelSubscription(orgId: string, subscriptionId: string) {
    // Verify subscription belongs to organization
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        orgId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Use PaymentProvider to cancel (cancels at period end by default)
    await this.paymentProvider.cancelSubscription({
      subscriptionId,
      immediately: false,
    });

    // Fetch updated subscription
    return this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
  }

  /**
   * List invoices for organization
   */
  async listInvoices(orgId: string, query: InvoiceQueryDto) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { orgId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(orgId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        orgId,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        subscription: { select: { id: true, plan: true, status: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * List payments for organization
   */
  async listPayments(orgId: string, query: PaymentQueryDto) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { orgId };
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Get latest subscription for organization (used by organizations controller)
   */
  async getOrgSubscription(orgId: string) {
    return this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get invoices for organization with pagination (used by organizations controller)
   */
  async getOrgInvoices(orgId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { orgId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where: { orgId } }),
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * Get subscription status summary (used by admin panel)
   */
  async getSubscriptionStatus(orgId: string) {
    const [forceMaxPlan, subscription, organization] = await Promise.all([
      this.hasPlatformAdmin(orgId),
      this.prisma.subscription.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      }),
    ]);

    const fallbackPlan = forceMaxPlan ? 'PRO' : this.toDisplayPlan(organization?.plan);

    if (forceMaxPlan) {
      return {
        status: 'active',
        plan: 'PRO',
        currentPeriodEnd: subscription?.currentPeriodEnd,
      };
    }

    if (!subscription) {
      return {
        status: this.toDisplayStatus(null, fallbackPlan),
        plan: fallbackPlan,
      };
    }

    const subscriptionPlan = forceMaxPlan ? 'PRO' : this.toDisplayPlan(subscription.plan);
    return {
      status: forceMaxPlan ? 'active' : this.toDisplayStatus(subscription.status, subscriptionPlan),
      plan: subscriptionPlan,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  /**
   * Get subscription info for site (read-only, minimal data)
   * Note: Sites don't have subscriptions directly - they belong to organizations
   * Site can only READ basic subscription info (plan, status) - NO access to org data
   * Full billing management is at Organization level only
   * GET /billing/site/:id
   */
  async getSiteSubscription(orgId: string, siteId: string) {
    const [forceMaxPlan, site, subscription, organization] = await Promise.all([
      this.hasPlatformAdmin(orgId),
      this.prisma.site.findFirst({
        where: { id: siteId, orgId },
        select: { orgId: true },
      }),
      this.prisma.subscription.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orgId: true,
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
          // NO organization data - site has no access to org
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      }),
    ]);

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const fallbackPlan = forceMaxPlan ? 'PRO' : this.toDisplayPlan(organization?.plan);

    if (!subscription) {
      return {
        siteId,
        plan: fallbackPlan,
        status: forceMaxPlan ? 'active' : this.toDisplayStatus(null, fallbackPlan),
        renewalDate: null,
      };
    }

    const subscriptionPlan = forceMaxPlan ? 'PRO' : this.toDisplayPlan(subscription.plan);

    // Return only minimal subscription info - NO org data
    return {
      siteId,
      plan: subscriptionPlan,
      status: forceMaxPlan ? 'active' : this.toDisplayStatus(subscription.status, subscriptionPlan),
      renewalDate: subscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Update subscription for site
   * WARNING: This should be called from Organization level, not Site level
   * Sites should NOT be able to modify subscriptions - only Organization can
   * This method is kept for backward compatibility and is org-scoped
   * POST /billing/site/:id/update
   */
  async updateSiteSubscription(orgId: string, siteId: string, dto: UpdateSiteSubscriptionDto) {
    // Get site to find its organization (only orgId, no org data)
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, orgId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Find existing subscription or create new one for the organization
    const subscription = await this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    const updateData: { plan?: string; status?: string; currentPeriodEnd?: Date } = {};

    if (dto.plan !== undefined) {
      updateData.plan = dto.plan;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    if (dto.renewalDate !== undefined) {
      updateData.currentPeriodEnd = new Date(dto.renewalDate);
    }

    let updatedSubscription;
    if (subscription) {
      // Update existing subscription
      updatedSubscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
        select: {
          id: true,
          orgId: true,
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
          cancelledAt: true,
          trialStart: true,
          trialEnd: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
        },
      });
    } else {
      // Create new subscription if doesn't exist
      const now = new Date();
      const renewalDate = dto.renewalDate ? new Date(dto.renewalDate) : this.calculatePeriodEnd();

      updatedSubscription = await this.prisma.subscription.create({
        data: {
          orgId: orgId,
          plan: dto.plan || 'BASIC',
          status: dto.status || 'active',
          currentPeriodStart: now,
          currentPeriodEnd: renewalDate,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          trialStart: null,
          trialEnd: null,
          stripeSubscriptionId: null,
          stripeCustomerId: null,
        },
        select: {
          id: true,
          orgId: true,
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
          cancelledAt: true,
          trialStart: true,
          trialEnd: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
        },
      });
    }

    // Return only minimal subscription info - NO org data
    return {
      siteId,
      plan: updatedSubscription.plan,
      status: updatedSubscription.status,
      renewalDate: updatedSubscription.currentPeriodEnd,
      currentPeriodStart: updatedSubscription.currentPeriodStart,
      cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
      createdAt: updatedSubscription.createdAt,
      updatedAt: updatedSubscription.updatedAt,
    };
  }

  /**
   * Get billing info for current user (all their organizations)
   * GET /billing/me
   * Returns: subscriptions list, invoices list, and organizations summary
   */
  async getMyBillingInfo(userId: string) {
    // Try UserOrg model first (multi-org support)
    let userOrgs: Array<{ orgId: string; role: string; organization: any }> = [];

    const memberships = await this.prisma.userOrg.findMany({
      where: { userId },
      select: {
        orgId: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (memberships.length > 0) {
      userOrgs = memberships.map((m) => ({
        orgId: m.orgId,
        role: m.role,
        organization: m.organization,
      }));
    } else {
      const legacy = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (legacy?.orgId) {
        userOrgs = [
          {
            orgId: legacy.orgId,
            role: legacy.role,
            organization: legacy.organization,
          },
        ];
      }
    }

    const orgIds = userOrgs.map((uo) => uo.orgId);
    const privilegedOrgSet = await this.getPrivilegedOrgSet(orgIds);

    // Fetch all subscriptions for user's organizations
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        orgId: { in: orgIds },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all invoices for user's organizations
    const invoices = await this.prisma.invoice.findMany({
      where: {
        orgId: { in: orgIds },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const organizations = userOrgs.map((uo) => {
      const latestSubscription = uo.organization?.subscriptions?.[0];
      const forceMaxPlan = privilegedOrgSet.has(uo.orgId);
      const displayPlan = forceMaxPlan
        ? 'PRO'
        : this.toDisplayPlan(latestSubscription?.plan || uo.organization?.plan);
      const displayStatus = forceMaxPlan
        ? 'active'
        : this.toDisplayStatus(latestSubscription?.status, displayPlan);
      return {
        orgId: uo.orgId,
        orgName: uo.organization?.name || '',
        orgSlug: uo.organization?.slug || '',
        plan: displayPlan,
        status: displayStatus,
        renewalDate: latestSubscription?.currentPeriodEnd || null,
        role: uo.role,
      };
    });

    const mappedSubscriptions = subscriptions.map((sub) => {
      const forceMaxPlan = privilegedOrgSet.has(sub.orgId);
      const displayPlan = forceMaxPlan ? 'PRO' : this.toDisplayPlan(sub.plan);
      const displayStatus = forceMaxPlan
        ? 'active'
        : this.toDisplayStatus(sub.status, displayPlan);
      return {
        id: sub.id,
        orgId: sub.orgId,
        plan: displayPlan,
        status: displayStatus,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        organization: sub.organization,
      };
    });

    const orgIdsWithSubscriptions = new Set(mappedSubscriptions.map((item) => item.orgId));
    const syntheticSubscriptions = organizations
      .filter((org) => !orgIdsWithSubscriptions.has(org.orgId) && org.status !== 'none')
      .map((org) => ({
        id: `virtual-${org.orgId}`,
        orgId: org.orgId,
        plan: org.plan,
        status: org.status,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        organization: {
          id: org.orgId,
          name: org.orgName,
          slug: org.orgSlug,
        },
      }));

    return {
      userId,
      organizations,
      totalOrgs: organizations.length,
      subscriptions: [...mappedSubscriptions, ...syntheticSubscriptions],
      invoices: invoices.map((inv) => ({
        id: inv.id,
        orgId: inv.orgId,
        subscriptionId: inv.subscriptionId,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        paidAt: inv.paidAt?.toISOString() || null,
        organization: inv.organization,
        subscription: inv.subscription,
      })),
    };
  }
}
