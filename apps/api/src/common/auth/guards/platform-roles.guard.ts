import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole, SystemRole } from '../roles.enum';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PlatformRolesGuard - checks if user has required platform role
 * AI Note: Use with @PlatformRoles() decorator: @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
 * 
 * This guard is for platform-level endpoints (create tenants, manage users across tenants)
 * It checks the platformRole field in the JWT token, not the tenant role.
 * Fallback: If token doesn't have platformRole but user has super_admin role in DB, grant platform_admin access.
 */
@Injectable()
export class PlatformRolesGuard implements CanActivate {
  private readonly logger = new Logger(PlatformRolesGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    this.logger.debug(`Checking platform role for user ${user.id} (role: ${user.role}, platformRole: ${user.platformRole}, systemRole: ${user.systemRole}, isSuperAdmin: ${user.isSuperAdmin})`);
    
    // Check if user is super admin or has system role - they have access to everything
    if (user.isSuperAdmin || user.systemRole === SystemRole.SUPER_ADMIN) {
      this.logger.debug(`User ${user.id} is super admin - granting access`);
      return true;
    }

    // System admins also have platform admin access
    if (user.systemRole === SystemRole.SYSTEM_ADMIN) {
      this.logger.debug(`User ${user.id} is system admin - granting access`);
      return true;
    }

    let userPlatformRole = user.platformRole as PlatformRole | undefined;

    // Always check database for super_admin users to ensure they have platform_admin access
    // This handles cases where:
    // 1. Token doesn't have platformRole (old tokens)
    // 2. Token has incorrect platformRole
    // 3. User role changed in database but token wasn't refreshed
    if (user.id) {
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { 
            role: true,
            isSuperAdmin: true,
            systemRole: true,
            platformRole: true,
          },
        });
        
        // If user is super_admin in database, always grant platform_admin access
        if (dbUser?.isSuperAdmin || dbUser?.systemRole === SystemRole.SUPER_ADMIN) {
          this.logger.log(`✓ Granting platform_admin access to user ${user.id} (email: ${user.email}) based on super_admin/systemRole in database`);
          return true;
        }

        // System admin also has access
        if (dbUser?.systemRole === SystemRole.SYSTEM_ADMIN) {
          this.logger.log(`✓ Granting platform_admin access to user ${user.id} (email: ${user.email}) based on system_admin role in database`);
          return true;
        }

        // Use platformRole from database if available
        if (dbUser?.platformRole) {
          userPlatformRole = dbUser.platformRole as PlatformRole;
        } else if (dbUser?.role === 'super_admin') {
          // Backward compatibility
          this.logger.log(`✓ Granting platform_admin access to user ${user.id} based on super_admin role in database (backward compatibility)`);
          return true;
        }
      } catch (error) {
        // If database check fails, fall back to token-based check
        this.logger.warn(`Failed to check user role in database for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
        
        // Fallback: Check if user.role from token is super_admin
        if (!userPlatformRole && user.role === 'super_admin') {
          this.logger.debug(`Granting platform_admin access to user ${user.id} based on super_admin role in token (database check failed)`);
          return true;
        }
      }
    } else {
      // If user.id is not available, fall back to token-based check
      if (!userPlatformRole && user.role === 'super_admin') {
        this.logger.debug(`Granting platform_admin access to user based on super_admin role in token (no user.id available)`);
        return true;
      }
    }

    if (!userPlatformRole) {
      this.logger.warn(`User ${user.id} (role: ${user.role}, platformRole: ${user.platformRole}) does not have a platform role. Required: ${requiredPlatformRoles.join(' or ')}`);
      throw new ForbiddenException(
        `Access denied. Required platform role: ${requiredPlatformRoles.join(' or ')}`,
      );
    }

    // Platform admin/owner has access to everything
    if (userPlatformRole === PlatformRole.ADMIN || userPlatformRole === PlatformRole.OWNER) {
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

