import { SetMetadata } from '@nestjs/common';
import { PLAN_LIMITS_KEY, PlanLimitMetadata } from '../plan-limits.guard';

/**
 * RequirePlan Decorator
 * AI Note: Use this decorator to enforce plan limits on endpoints
 * 
 * @example
 * @RequirePlan({ resourceType: 'collection' })
 * @Post()
 * async createCollection() { ... }
 * 
 * @example
 * @RequirePlan({ resourceType: 'storage', storageMB: 10 })
 * @Post('upload')
 * async uploadFile() { ... }
 */
export const RequirePlan = (metadata: PlanLimitMetadata) => SetMetadata(PLAN_LIMITS_KEY, metadata);




