import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
   */
  async createSubscription(tenantId: string, dto: CreateSubscriptionDto) {
    if (!dto.plan) {
      throw new BadRequestException('Plan is required');
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(dto.trialDays);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        plan: dto.plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: dto.trialDays ? now : null,
        trialEnd: dto.trialDays ? periodEnd : null,
      },
    });

    return subscription;
  }

  /**
   * Update subscription
   */
  async updateSubscription(tenantId: string, subscriptionId: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updateData: any = {};
    if (dto.plan !== undefined) {
      updateData.plan = dto.plan;
    }
    if (dto.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = dto.cancelAtPeriodEnd;
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'cancelled', cancelAtPeriodEnd: true },
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
    };
  }
}
