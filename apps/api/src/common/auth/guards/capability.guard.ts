import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../../../modules/rbac/rbac.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { CAPABILITY_KEY } from '../decorators/capabilities.decorator';

/**
 * CapabilityGuard - sprawdza czy użytkownik ma capability z uwzględnieniem org policy
 * 
 * Użycie:
 * @Capabilities('marketing.publish', 'marketing.ads.manage')
 * 
 * Weryfikacja: can = role_has_capability AND policy_enabled
 */

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<string[]>(
      CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      // No capabilities required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const orgId = request.orgId || user.orgId;
    const siteId = request.params?.siteId || request.body?.siteId || request.query?.siteId;

    // Check each required capability
    for (const capabilityKey of requiredCapabilities) {
      const canPerform = await this.rbacService.canUserPerform(
        orgId,
        user.id,
        capabilityKey,
        siteId,
      );

      if (!canPerform) {
        // Check if it's a policy issue
        const policies = await this.rbacService.getPolicies(orgId);
        const policy = policies.find((p: { capabilityKey: string }) => p.capabilityKey === capabilityKey);
        
        if (policy && !policy.enabled) {
          throw new ForbiddenException({
            message: `Capability "${capabilityKey}" is disabled by organization policy`,
            reason: 'policy_disabled',
            capabilityKey,
          });
        }

        throw new ForbiddenException({
          message: `Insufficient permissions. Required capability: ${capabilityKey}`,
          reason: 'missing_capability',
          capabilityKey,
        });
      }
    }

    return true;
  }
}

