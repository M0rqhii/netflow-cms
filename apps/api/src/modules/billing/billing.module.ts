import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SaasModule } from '../../common/saas/saas.module';
import { AuditModule } from '../../common/audit/audit.module';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Billing Module
 * AI Note: Handles billing and subscription management
 */
@Module({
  imports: [SaasModule, AuditModule],
  controllers: [BillingController],
  providers: [BillingService, StripeService, PrismaService],
  exports: [BillingService, StripeService],
})
export class BillingModule {}




