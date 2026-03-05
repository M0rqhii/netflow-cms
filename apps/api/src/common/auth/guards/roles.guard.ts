import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SiteRole, SystemRole } from '../roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * RolesGuard - checks if user has required site role
 * AI Note: Use with @Roles() decorator: @Roles(SiteRole.ADMIN, SiteRole.EDITOR)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    // Super admin has access to everything
    if (user.isSuperAdmin || user.systemRole === SystemRole.SUPER_ADMIN) {
      return true;
    }

    const userSiteRole = user.siteRole as SiteRole | undefined;

    // Site owner has access to everything within the site
    if (userSiteRole === SiteRole.OWNER) {
      return true;
    }

    // Check if user site role is in required roles
    if (!userSiteRole || !requiredRoles.includes(userSiteRole)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}


