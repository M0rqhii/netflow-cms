import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaymentProvider,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  CancelSubscriptionParams,
  SubscriptionResult,
} from '../interfaces/payment-provider.interface';

/**
 * DevPaymentProvider
 * 
 * Development-only implementation that simulates payment processing
 * without calling external services. Stores fake subscriptions in the database.
 */
@Injectable()
export class DevPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(DevPaymentProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    this.logger.log(`[DEV] Creating subscription for tenant ${params.tenantId}, plan: ${params.plan}`);

    const now = new Date();
    const trialDays = params.trialDays ?? 0;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (trialDays > 0 ? trialDays : 30));

    // Create subscription in database
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: params.tenantId,
        plan: params.plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: trialDays > 0 ? now : null,
        trialEnd: trialDays > 0 ? periodEnd : null,
        stripeCustomerId: params.customerId || `dev_customer_${params.tenantId}`,
        stripeSubscriptionId: `dev_sub_${Date.now()}_${params.tenantId}`,
      },
    });

    this.logger.log(`[DEV] Created subscription ${subscription.id} with status: active`);

    return {
      id: subscription.id,
      externalId: subscription.stripeSubscriptionId || undefined,
      status: subscription.status as SubscriptionResult['status'],
      plan: subscription.plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      customerId: subscription.stripeCustomerId || undefined,
      metadata: params.metadata,
    };
  }

  async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionResult> {
    this.logger.log(`[DEV] Updating subscription ${params.subscriptionId}`);

    const updateData: any = {};
    if (params.plan !== undefined) {
      updateData.plan = params.plan;
    }
    if (params.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = params.cancelAtPeriodEnd;
    }

    const subscription = await this.prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: updateData,
    });

    this.logger.log(`[DEV] Updated subscription ${subscription.id}`);

    return {
      id: subscription.id,
      externalId: subscription.stripeSubscriptionId || undefined,
      status: subscription.status as SubscriptionResult['status'],
      plan: subscription.plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      customerId: subscription.stripeCustomerId || undefined,
      metadata: params.metadata,
    };
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<SubscriptionResult> {
    this.logger.log(`[DEV] Cancelling subscription ${params.subscriptionId}, immediately: ${params.immediately}`);

    const subscription = await this.prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: {
        status: params.immediately ? 'cancelled' : 'active',
        cancelAtPeriodEnd: !params.immediately,
        cancelledAt: params.immediately ? new Date() : null,
      },
    });

    this.logger.log(`[DEV] Cancelled subscription ${subscription.id}, status: ${subscription.status}`);

    return {
      id: subscription.id,
      externalId: subscription.stripeSubscriptionId || undefined,
      status: subscription.status as SubscriptionResult['status'],
      plan: subscription.plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      customerId: subscription.stripeCustomerId || undefined,
    };
  }

  async getSubscriptionByExternalId(externalId: string): Promise<SubscriptionResult | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: externalId },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      externalId: subscription.stripeSubscriptionId || undefined,
      status: subscription.status as SubscriptionResult['status'],
      plan: subscription.plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      customerId: subscription.stripeCustomerId || undefined,
    };
  }

  async isSubscriptionActive(subscriptionId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return false;
    }

    return subscription.status === 'active' || subscription.status === 'trialing';
  }
}

