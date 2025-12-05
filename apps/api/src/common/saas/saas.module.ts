import { Module, Global } from '@nestjs/common';
import { PlanLimitsService } from './plan-limits.service';
import { PlanLimitsGuard } from './plan-limits.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SaaS Module - Plan limits and resource management
 * AI Note: Global module for managing plan-based resource limits
 */
@Global()
@Module({
  providers: [PlanLimitsService, PlanLimitsGuard, PrismaService],
  exports: [PlanLimitsService, PlanLimitsGuard],
})
export class SaasModule {}

