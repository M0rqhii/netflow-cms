/**
 * PaymentProvider Interface
 * 
 * Abstract interface for payment processing providers (Stripe, PayPal, etc.)
 * Represents what the platform needs to do, not how specific providers implement it.
 */

export interface CreateSubscriptionParams {
  tenantId: string;
  plan: string;
  customerId?: string; // External customer ID (e.g., Stripe customer ID)
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionResult {
  id: string; // Internal subscription ID
  externalId?: string; // Provider-specific subscription ID (e.g., Stripe subscription ID)
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  plan: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  plan?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  immediately?: boolean; // If true, cancel immediately; if false, cancel at period end
}

export interface PaymentProvider {
  /**
   * Create a new subscription
   */
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>;

  /**
   * Update an existing subscription
   */
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionResult>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(params: CancelSubscriptionParams): Promise<SubscriptionResult>;

  /**
   * Get subscription status by external ID (provider-specific)
   */
  getSubscriptionByExternalId(externalId: string): Promise<SubscriptionResult | null>;

  /**
   * Check if a subscription is active
   */
  isSubscriptionActive(subscriptionId: string): Promise<boolean>;
}









