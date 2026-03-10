import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Permission,
  OrgRole,
  hasAnyOrgPermission,
  hasSitePermission,
} from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import {
  getCapabilityCandidatesForPermission,
  resolveAuthorizationContext,
  resolveLegacyOrgRole,
  resolveLegacySiteRole,
} from '../legacy-rbac-bridge';
import { isPlatformPowerUser } from '../platform-admin.util';
import { RbacService } from '../../../modules/rbac/rbac.service';

/**
 * PermissionsGuard - central permission checking guard
 * AI Note: Checks system, site, and org-level permissions
 *
 * This guard checks in order:
 * 1. System Role permissions (super_admin, system_admin, system_dev, system_support)
 * 2. Site Role permissions (viewer, editor, editor-in-chief, marketing, admin, owner)
 * 3. Org Role permissions (user, editor-in-chief, admin, owner)
 *
 * Use with @Permissions() decorator: @Permissions(Permission.USERS_READ)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 1. Check System / platform-admin permissions (highest priority)
    if (isPlatformPowerUser(user)) {
      return true; // Super admin has all permissions
    }

    const { orgId, siteId } = resolveAuthorizationContext(request, user);
    if (await this.hasMappedCapabilityAccess(requiredPermissions, user, orgId, siteId)) {
      return true;
    }

    // 2. Check Site Role permissions
    const siteRole = resolveLegacySiteRole(user);
    if (siteRole) {
      const hasSitePerm = requiredPermissions.some(perm =>
        hasSitePermission(siteRole, perm)
      );
      if (hasSitePerm) {
        return true;
      }
    }

    // 3. Check Org Role permissions
    const resolvedOrgRole = resolveLegacyOrgRole(user);
    if (resolvedOrgRole) {
      const hasOrgPerm = requiredPermissions.some(perm =>
        hasAnyOrgPermission(resolvedOrgRole as OrgRole, [perm])
      );
      if (hasOrgPerm) {
        return true;
      }
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }

  private async hasMappedCapabilityAccess(
    requiredPermissions: Permission[],
    user: CurrentUserPayload,
    orgId?: string,
    siteId?: string,
  ): Promise<boolean> {
    if (!user.id) {
      return false;
    }

    const capabilityKeys = Array.from(
      new Set(
        requiredPermissions.flatMap((permission) => getCapabilityCandidatesForPermission(permission)),
      ),
    );

    if (capabilityKeys.length === 0) {
      return false;
    }

    const platformCapabilityKeys = capabilityKeys.filter((key) => key.startsWith('platform.'));
    if (platformCapabilityKeys.length > 0) {
      const platformCapabilities = await this.rbacService.getEffectivePlatformCapabilities(user.id);
      const allowedPlatformKeys = new Set(
        platformCapabilities
          .filter((capability: { key: string; allowed: boolean }) => capability.allowed)
          .map((capability: { key: string }) => capability.key),
      );

      if (platformCapabilityKeys.some((key) => allowedPlatformKeys.has(key))) {
        return true;
      }
    }

    if (!orgId) {
      return false;
    }

    for (const capabilityKey of capabilityKeys.filter((key) => !key.startsWith('platform.'))) {
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
