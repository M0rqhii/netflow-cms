import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { 
  Permission, 
  Role, 
  PlatformRole, 
  SystemRole,
  SiteRole,
  hasAnyPermission, 
  hasAnyPlatformPermission,
  hasSystemPermission,
  hasSitePermission,
} from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * PermissionsGuard - central permission checking guard
 * AI Note: Checks system, site, and platform-level permissions
 * 
 * This guard checks in order:
 * 1. System Role permissions (super_admin, system_admin, system_dev, system_support)
 * 2. Site Role permissions (viewer, editor, editor-in-chief, marketing, admin, owner)
 * 3. Platform Role permissions (user, editor-in-chief, admin, owner)
 * 4. Backward compatibility: old Role permissions
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

    // 1. Check System Role permissions (highest priority)
    if (user.isSuperAdmin || user.systemRole === SystemRole.SUPER_ADMIN) {
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

    // 3. Check Platform Role permissions
    if (user.platformRole) {
      const platformRole = user.platformRole as PlatformRole;
      const hasPlatformPerm = requiredPermissions.some(perm => 
        hasAnyPlatformPermission(platformRole, [perm])
      );
      if (hasPlatformPerm) {
        return true;
      }
    }

    // 4. Backward compatibility: Check old Role permissions
    const userRole = user.role as Role;
    if (userRole === Role.SUPER_ADMIN) {
      return true;
    }
    
    const hasTenantPermission = hasAnyPermission(userRole, requiredPermissions);
    if (hasTenantPermission) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }
}


