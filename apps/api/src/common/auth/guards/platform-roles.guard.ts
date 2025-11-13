import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '../roles.enum';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/**
 * PlatformRolesGuard - checks if user has required platform role
 * AI Note: Use with @PlatformRoles() decorator: @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
 * 
 * This guard is for platform-level endpoints (create tenants, manage users across tenants)
 * It checks the platformRole field in the JWT token, not the tenant role.
 */
@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlatformRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlatformRoles || requiredPlatformRoles.length === 0) {
      // No platform roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPlatformRole = user.platformRole as PlatformRole | undefined;

    if (!userPlatformRole) {
      throw new ForbiddenException('User does not have a platform role');
    }

    // Platform admin has access to everything
    if (userPlatformRole === PlatformRole.PLATFORM_ADMIN) {
      return true;
    }

    // Check if user platform role is in required platform roles
    if (!requiredPlatformRoles.includes(userPlatformRole)) {
      throw new ForbiddenException(
        `Access denied. Required platform role: ${requiredPlatformRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

