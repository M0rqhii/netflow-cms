import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanLimitsService } from './plan-limits.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/**
 * Plan Limits Guard
 * AI Note: Enforces plan-based resource limits
 * Use with @RequirePlan() decorator to check if tenant can perform action
 */
export const PLAN_LIMITS_KEY = 'plan_limits';

export interface PlanLimitMetadata {
  resourceType: 'collection' | 'contentType' | 'mediaFile' | 'user' | 'webhook' | 'storage';
  storageMB?: number; // Required if resourceType is 'storage'
}

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const planLimitMetadata = this.reflector.getAllAndOverride<PlanLimitMetadata>(
      PLAN_LIMITS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!planLimitMetadata) {
      // No plan limits required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const { resourceType, storageMB } = planLimitMetadata;

    if (resourceType === 'storage') {
      if (!storageMB) {
        throw new Error('storageMB is required when resourceType is "storage"');
      }

      const canUse = await this.planLimitsService.canUseStorage(user.tenantId, storageMB);
      if (!canUse.allowed) {
        throw new ForbiddenException({
          message: 'Plan limit exceeded',
          reason: canUse.reason,
          currentUsage: canUse.currentUsage,
          limit: canUse.limit,
          upgradeRequired: true,
        });
      }
    } else {
      const canCreate = await this.planLimitsService.canCreateResource(user.tenantId, resourceType);
      if (!canCreate.allowed) {
        throw new ForbiddenException({
          message: 'Plan limit exceeded',
          reason: canCreate.reason,
          upgradeRequired: true,
        });
      }
    }

    return true;
  }
}




