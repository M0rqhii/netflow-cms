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
   * Get subscription for tenant by id
   */
  async getSubscription(tenantId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
      include: {
        tenant: {
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
   * List subscriptions for tenant
   */
  async listSubscriptions(tenantId: string, query: SubscriptionQueryDto) {
    const { status, plan, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
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
  async createSubscription(tenantId: string, dto: CreateSubscriptionDto) {
    if (!dto.plan) {
      throw new BadRequestException('Plan is required');
    }

    const result = await this.paymentProvider.createSubscription({
      tenantId,
      plan: dto.plan,
      customerId: dto.stripeCustomerId,
      trialDays: dto.trialDays,
    });

    // Fetch the created subscription from DB to return full details
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: result.id },
      include: {
        tenant: {
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
  async updateSubscription(tenantId: string, subscriptionId: string, dto: UpdateSubscriptionDto) {
    // Verify subscription belongs to tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
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
  async cancelSubscription(tenantId: string, subscriptionId: string) {
    // Verify subscription belongs to tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
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
   * List invoices for tenant
   */
  async listInvoices(tenantId: string, query: InvoiceQueryDto) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
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
  async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        subscription: { select: { id: true, plan: true, status: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * List payments for tenant
   */
  async listPayments(tenantId: string, query: PaymentQueryDto) {
    const { page, pageSize, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
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
   * Get latest subscription for tenant (used by tenants controller)
   */
  async getTenantSubscription(tenantId: string) {
    return this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get invoices for tenant with pagination (used by tenants controller)
   */
  async getTenantInvoices(tenantId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where: { tenantId } }),
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
  async getSubscriptionStatus(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
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
   * Get subscription for site (siteId = tenantId)
   * GET /billing/site/:id
   */
  async getSiteSubscription(siteId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId: siteId },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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

    return {
      siteId: subscription.tenantId,
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
   * POST /billing/site/:id/update
   */
  async updateSiteSubscription(siteId: string, dto: UpdateSiteSubscriptionDto) {
    // Find existing subscription or create new one
    let subscription = await this.prisma.subscription.findFirst({
      where: { tenantId: siteId },
      orderBy: { createdAt: 'desc' },
    });

    const updateData: any = {};

    if (dto.plan !== undefined) {
      updateData.plan = dto.plan;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    if (dto.renewalDate !== undefined) {
      updateData.currentPeriodEnd = new Date(dto.renewalDate);
    }

    if (subscription) {
      // Update existing subscription
      subscription = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } else {
      // Create new subscription if doesn't exist
      const now = new Date();
      const renewalDate = dto.renewalDate ? new Date(dto.renewalDate) : this.calculatePeriodEnd();

      subscription = await this.prisma.subscription.create({
        data: {
          tenantId: siteId,
          plan: dto.plan || 'BASIC',
          status: dto.status || 'active',
          currentPeriodStart: now,
          currentPeriodEnd: renewalDate,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    }

    return {
      siteId: subscription.tenantId,
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
   * Get billing info for current user (all their sites/tenants)
   * GET /billing/me
   * Returns: subscriptions list, invoices list, and sites summary
   */
  async getMyBillingInfo(userId: string) {
    // Try UserTenant model first (multi-tenant support)
    let userTenants: Array<{ tenantId: string; role: string; tenant: any }> = [];

    try {
      const memberships = await this.prisma.userTenant.findMany({
        where: { userId },
        include: {
          tenant: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1, // Latest subscription per tenant
              },
            },
          },
        },
      });

      userTenants = memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
        tenant: m.tenant,
      }));
    } catch (error) {
      // Fallback to legacy single-tenant relation (backward compatibility)
      const legacy = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (legacy?.tenantId) {
        userTenants = [
          {
            tenantId: legacy.tenantId,
            role: legacy.role,
            tenant: legacy.tenant,
          },
        ];
      }
    }

    const tenantIds = userTenants.map((ut) => ut.tenantId);

    // Fetch all subscriptions for user's tenants
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        tenantId: { in: tenantIds },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all invoices for user's tenants
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId: { in: tenantIds },
      },
      include: {
        tenant: {
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

    const sites = userTenants.map((ut) => {
      const latestSubscription = ut.tenant?.subscriptions?.[0];
      return {
        siteId: ut.tenantId,
        siteName: ut.tenant?.name || '',
        siteSlug: ut.tenant?.slug || '',
        plan: latestSubscription?.plan || 'BASIC',
        status: latestSubscription?.status || 'none',
        renewalDate: latestSubscription?.currentPeriodEnd || null,
        role: ut.role,
      };
    });

    return {
      userId,
      sites,
      totalSites: sites.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        tenantId: sub.tenantId,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        tenant: sub.tenant,
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        tenantId: inv.tenantId,
        subscriptionId: inv.subscriptionId,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        paidAt: inv.paidAt?.toISOString() || null,
        tenant: inv.tenant,
        subscription: inv.subscription,
      })),
    };
  }
}
