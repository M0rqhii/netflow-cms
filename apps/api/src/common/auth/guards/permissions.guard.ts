import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, hasAnyPermission } from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * PermissionsGuard - checks if user has required permissions
 * AI Note: Use with @Permissions() decorator: @Permissions(Permission.USERS_READ)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
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

    const userRole = user.role as Role;

    // Check if user has any of the required permissions
    const hasAccess = hasAnyPermission(userRole, requiredPermissions);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}


