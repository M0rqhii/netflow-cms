import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Permission,
  OrgRole,
  SystemRole,
  SiteRole,
  hasAnyOrgPermission,
  hasSystemPermission,
  hasSitePermission,
} from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { isPlatformPowerUser } from '../platform-admin.util';

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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    if (isPlatformPowerUser(user) || user.systemRole === SystemRole.SUPER_ADMIN) {
      return true; // Super admin has all permissions
    }

    if (user.systemRole) {
      const systemRole = user.systemRole as SystemRole;
      const hasSystemPerm = requiredPermissions.some(perm =>
        hasSystemPermission(systemRole, perm)
      );
      if (hasSystemPerm) {
        return true;
      }
    }

    // 2. Check Site Role permissions
    if (user.siteRole) {
      const siteRole = user.siteRole as SiteRole;
      const hasSitePerm = requiredPermissions.some(perm =>
        hasSitePermission(siteRole, perm)
      );
      if (hasSitePerm) {
        return true;
      }
    }

    // 3. Check Org Role permissions
    const resolvedOrgRole = (user.orgRole || user.platformRole) as OrgRole | undefined;
    if (resolvedOrgRole) {
      const orgRole = resolvedOrgRole;
      const hasOrgPerm = requiredPermissions.some(perm =>
        hasAnyOrgPermission(orgRole, [perm])
      );
      if (hasOrgPerm) {
        return true;
      }
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }
}

