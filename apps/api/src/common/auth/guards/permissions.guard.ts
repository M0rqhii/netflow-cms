import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, PlatformRole, hasAnyPermission, hasAnyPlatformPermission } from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * PermissionsGuard - central permission checking guard
 * AI Note: Checks both tenant-level and platform-level permissions
 * 
 * This guard:
 * 1. Checks tenant-level permissions (Role-based)
 * 2. Checks platform-level permissions (PlatformRole-based)
 * 3. Allows access if either check passes
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

    // Check tenant-level permissions
    const userRole = user.role as Role;
    const hasTenantPermission = hasAnyPermission(userRole, requiredPermissions);

    if (hasTenantPermission) {
      return true;
    }

    // Check platform-level permissions
    const userPlatformRole = user.platformRole as PlatformRole | undefined;
    if (userPlatformRole) {
      const hasPlatformPermission = hasAnyPlatformPermission(userPlatformRole, requiredPermissions);
      if (hasPlatformPermission) {
        return true;
      }
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }
}


