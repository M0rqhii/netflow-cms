import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import {
  CreateSubscriptionDtoSchema,
  UpdateSubscriptionDtoSchema,
  SubscriptionQueryDtoSchema,
  InvoiceQueryDtoSchema,
  PaymentQueryDtoSchema,
  UpdateSiteSubscriptionDtoSchema,
  type CreateSubscriptionDto,
  type UpdateSubscriptionDto,
  type SubscriptionQueryDto,
  type InvoiceQueryDto,
  type PaymentQueryDto,
  type UpdateSiteSubscriptionDto,
} from './dto';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';

/**
 * BillingController - RESTful API for billing operations
 * AI Note: Handles subscriptions, invoices, payments, and Stripe webhooks
 */
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Stripe webhook endpoint (public, signature verified in production)
   * POST /billing/webhooks/stripe
   */
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: any,
    @Query('signature') _signature: string,
  ): Promise<{ received: boolean }> {
    // In production, verify webhook signature:
    // const event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // Note: signature parameter is reserved for future webhook verification implementation
    
    const eventType = body.type;
    const data = body.data?.object;

    this.logger.log(`Received Stripe webhook: ${eventType}`);

    try {
      await this.stripeService.handleWebhook(eventType, data);
      return { received: true };
    } catch (error) {
      this.logger.error(`Error handling Stripe webhook: ${eventType}`, error as Error);
      throw error;
    }
  }

  /**
   * Get subscription status for current tenant
   * GET /billing/subscription/status
   */
  @Get('subscription/status')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getSubscriptionStatus(@CurrentOrg() orgId: string) {
    return this.billingService.getSubscriptionStatus(orgId);
  }

  /**
   * List subscriptions for current organization
   * GET /billing/subscriptions
   */
  @Get('subscriptions')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async listSubscriptions(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(SubscriptionQueryDtoSchema)) query: SubscriptionQueryDto,
  ) {
    return this.billingService.listSubscriptions(orgId, query);
  }

  /**
   * Get subscription by ID
   * GET /billing/subscriptions/:id
   */
  @Get('subscriptions/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getSubscription(
    @CurrentOrg() orgId: string,
    @Param('id') subscriptionId: string,
  ) {
    return this.billingService.getSubscription(orgId, subscriptionId);
  }

  /**
   * Create subscription for current organization
   * POST /billing/subscriptions
   */
  @Post('subscriptions')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_WRITE)
  async createSubscription(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateSubscriptionDtoSchema)) dto: CreateSubscriptionDto,
  ) {
    return this.billingService.createSubscription(orgId, dto);
  }

  /**
   * Update subscription
   * PATCH /billing/subscriptions/:id
   */
  @Patch('subscriptions/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_WRITE)
  async updateSubscription(
    @CurrentOrg() orgId: string,
    @Param('id') subscriptionId: string,
    @Body(new ZodValidationPipe(UpdateSubscriptionDtoSchema)) dto: UpdateSubscriptionDto,
  ) {
    return this.billingService.updateSubscription(orgId, subscriptionId, dto);
  }

  /**
   * Cancel subscription
   * DELETE /billing/subscriptions/:id
   */
  @Delete('subscriptions/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_WRITE)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @CurrentOrg() orgId: string,
    @Param('id') subscriptionId: string,
  ) {
    return this.billingService.cancelSubscription(orgId, subscriptionId);
  }

  /**
   * List invoices for current organization
   * GET /billing/invoices
   */
  @Get('invoices')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async listInvoices(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(InvoiceQueryDtoSchema)) query: InvoiceQueryDto,
  ) {
    return this.billingService.listInvoices(orgId, query);
  }

  /**
   * Get invoice by ID
   * GET /billing/invoices/:id
   */
  @Get('invoices/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getInvoice(
    @CurrentOrg() orgId: string,
    @Param('id') invoiceId: string,
  ) {
    return this.billingService.getInvoice(orgId, invoiceId);
  }

  /**
   * List payments for current organization
   * GET /billing/payments
   */
  @Get('payments')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async listPayments(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(PaymentQueryDtoSchema)) query: PaymentQueryDto,
  ) {
    return this.billingService.listPayments(orgId, query);
  }

  /**
   * Get subscription for site
   * GET /billing/site/:id
   */
  @Get('site/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getSiteSubscription(@Param('id') siteId: string) {
    return this.billingService.getSiteSubscription(siteId);
  }

  /**
   * Update subscription for site
   * POST /billing/site/:id/update
   */
  @Post('site/:id/update')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_WRITE)
  async updateSiteSubscription(
    @Param('id') siteId: string,
    @Body(new ZodValidationPipe(UpdateSiteSubscriptionDtoSchema)) dto: UpdateSiteSubscriptionDto,
  ) {
    return this.billingService.updateSiteSubscription(siteId, dto);
  }

  /**
   * Get billing info for current user (all their sites)
   * GET /billing/me
   */
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getMyBillingInfo(@CurrentUser() user: { id: string }) {
    return this.billingService.getMyBillingInfo(user.id);
  }
}
