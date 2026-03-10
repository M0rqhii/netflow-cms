import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SiteRole } from '../roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import {
  getCapabilityCandidatesForSiteRole,
  matchesRequiredSiteRole,
  resolveAuthorizationContext,
} from '../legacy-rbac-bridge';
import { isPlatformPowerUser } from '../platform-admin.util';
import { RbacService } from '../../../modules/rbac/rbac.service';

/**
 * RolesGuard - checks if user has required site role
 * AI Note: Use with @Roles() decorator: @Roles(SiteRole.ADMIN, SiteRole.EDITOR)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<SiteRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super/platform admin has access to everything
    if (isPlatformPowerUser(user)) {
      return true;
    }

    const { orgId, siteId } = resolveAuthorizationContext(request, user);
    if (await this.hasMappedRoleAccess(requiredRoles, user, orgId, siteId)) {
      return true;
    }

    if (!matchesRequiredSiteRole(user, requiredRoles)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }

  private async hasMappedRoleAccess(
    requiredRoles: SiteRole[],
    user: CurrentUserPayload,
    orgId?: string,
    siteId?: string,
  ): Promise<boolean> {
    if (!user.id || !orgId || !siteId) {
      return false;
    }

    const capabilityKeys = Array.from(
      new Set(requiredRoles.flatMap((role) => getCapabilityCandidatesForSiteRole(role))),
    );

    for (const capabilityKey of capabilityKeys) {
      const canPerform = await this.rbacService.canUserPerform(
        orgId,
        user.id,
        capabilityKey,
        siteId,
      );
      if (canPerform) {
        return true;
      }
    }

    return false;
  }
}
