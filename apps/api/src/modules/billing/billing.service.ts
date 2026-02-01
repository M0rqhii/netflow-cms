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

  // Backward compatibility alias
  async getTenantInvoices(orgId: string, page = 1, pageSize = 20) {
    return this.getOrgInvoices(orgId, page, pageSize);
  }

  /**
   * Get subscription status summary (used by admin panel)
   */
  async getSubscriptionStatus(orgId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return {
        status: 'none',
        plan: 'free',
      };
    }

    return {
      status: subscription.status,
      plan: subscription.plan,
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
    // Get site to find its organization (only orgId, no org data)
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, orgId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Get subscription for the organization (read-only for site)
    const subscription = await this.prisma.subscription.findFirst({
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
    });

    if (!subscription) {
      return {
        siteId,
        plan: 'BASIC',
        status: 'none',
        renewalDate: null,
      };
    }

    // Return only minimal subscription info - NO org data
    return {
      siteId,
      plan: subscription.plan,
      status: subscription.status,
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
          include: {
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
            include: {
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
      return {
        orgId: uo.orgId,
        orgName: uo.organization?.name || '',
        orgSlug: uo.organization?.slug || '',
        plan: latestSubscription?.plan || 'BASIC',
        status: latestSubscription?.status || 'none',
        renewalDate: latestSubscription?.currentPeriodEnd || null,
        role: uo.role,
      };
    });

    return {
      userId,
      organizations,
      totalOrgs: organizations.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        orgId: sub.orgId,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        organization: sub.organization,
      })),
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
