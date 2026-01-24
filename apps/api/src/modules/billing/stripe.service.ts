import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
// Reserved for future use - uncomment when needed
// import { PlanLimitsService } from '../../common/saas/plan-limits.service';
import { AuditLoggerService, AuditEventType } from '../../common/audit/audit-logger.service';

/**
 * Stripe Service
 * AI Note: Handles Stripe integration for billing
 * 
 * Features:
 * - Webhook handling for subscription events
 * - Subscription management
 * - Payment processing
 * 
 * Note: Install @stripe/stripe-js and stripe package for production
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  // private stripe: Stripe; // Uncomment when stripe package is installed

  constructor(
    private readonly prisma: PrismaService,
    // Reserved for future use - uncomment when needed
    // private readonly planLimitsService: PlanLimitsService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    // Initialize Stripe client
    // const stripeKey = process.env.STRIPE_SECRET_KEY;
    // if (stripeKey) {
    //   this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    // }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(eventType: string, data: any): Promise<void> {
    this.logger.log(`Handling Stripe webhook: ${eventType}`);

    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(data);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(data);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(data);
        break;
      default:
        this.logger.warn(`Unhandled webhook event: ${eventType}`);
    }
  }

  /**
   * Handle subscription update (created/updated)
   */
  private async handleSubscriptionUpdate(data: any): Promise<void> {
    const subscriptionId = data.id;
    const customerId = data.customer;
    const status = data.status;
    const plan = this.mapStripePlanToPlan(data.items?.data?.[0]?.price?.id);

    // Find organization by Stripe customer ID
    const organization = await this.prisma.organization.findFirst({
      where: {
        subscriptions: {
          some: {
            stripeCustomerId: customerId,
          },
        },
      },
    });

    if (!organization) {
      this.logger.warn(`Organization not found for Stripe customer: ${customerId}`);
      return;
    }

    // Update or create subscription
    await this.prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      update: {
        plan,
        status: this.mapStripeStatusToStatus(status),
        currentPeriodStart: new Date(data.current_period_start * 1000),
        currentPeriodEnd: new Date(data.current_period_end * 1000),
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
      },
      create: {
        orgId: organization.id,
        plan,
        status: this.mapStripeStatusToStatus(status),
        currentPeriodStart: new Date(data.current_period_start * 1000),
        currentPeriodEnd: new Date(data.current_period_end * 1000),
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        trialStart: null,
        trialEnd: null,
        cancelledAt: null,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
      },
    });

    // Update organization plan
    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { plan },
    });

    this.auditLogger.logOrgOperation(AuditEventType.ORG_PLAN_CHANGED, {
      orgId: organization.id,
      changes: { plan },
    });
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(data: any): Promise<void> {
    const subscriptionId = data.id;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Downgrade organization to free plan
    await this.prisma.organization.update({
      where: { id: subscription.orgId },
      data: { plan: 'free' },
    });

    this.auditLogger.logOrgOperation(AuditEventType.ORG_PLAN_CHANGED, {
      orgId: subscription.orgId,
      changes: { plan: 'free', reason: 'subscription_cancelled' },
    });
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(data: any): Promise<void> {
    const invoiceId = data.id;
    const subscriptionId = data.subscription;
    const amount = data.amount_paid / 100; // Convert from cents
    const currency = data.currency.toUpperCase();

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    // Create invoice record
    await this.prisma.invoice.create({
      data: {
        orgId: subscription.orgId,
        subscriptionId: subscription.id,
        amount: amount,
        currency,
        status: 'paid',
        paidAt: new Date(),
        stripeInvoiceId: invoiceId,
        invoiceNumber: `INV-${Date.now()}`,
        lineItems: data.lines?.data || [],
      },
    });
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    const subscriptionId = data.subscription;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'past_due',
      },
    });

    this.logger.warn(`Payment failed for subscription: ${subscriptionId}`);
  }

  /**
   * Map Stripe plan ID to internal plan
   */
  private mapStripePlanToPlan(stripePlanId: string | undefined): 'free' | 'professional' | 'enterprise' {
    // Map Stripe plan IDs to internal plans
    // In production, store this mapping in database or config
    if (!stripePlanId) return 'free';
    
    if (stripePlanId.includes('professional') || stripePlanId.includes('pro')) {
      return 'professional';
    }
    if (stripePlanId.includes('enterprise')) {
      return 'enterprise';
    }
    return 'free';
  }

  /**
   * Map Stripe status to internal status
   */
  private mapStripeStatusToStatus(stripeStatus: string): 'active' | 'cancelled' | 'past_due' | 'trialing' {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'trialing':
        return 'trialing';
      default:
        return 'active';
    }
  }

  /**
   * Check if organization subscription is active
   */
  async isSubscriptionActive(orgId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        orgId: orgId,
        status: { in: ['active', 'trialing'] },
      },
    });

    return !!subscription;
  }
}

