import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole, SystemRole } from '../roles.enum';
import { ORG_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * OrgRolesGuard - checks if user has required organization role
 * AI Note: Use with @OrgRoles() decorator: @OrgRoles(OrgRole.ADMIN)
 *
 * This guard is for org-level endpoints (manage organization, manage users within organization)
 * It checks the orgRole field in the JWT token.
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  private readonly logger = new Logger(OrgRolesGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredOrgRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredOrgRoles || requiredOrgRoles.length === 0) {
      // No org roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    this.logger.debug(`Checking org role for user ${user.id} (orgRole: ${user.orgRole}, systemRole: ${user.systemRole}, isSuperAdmin: ${user.isSuperAdmin})`);

    // Check if user is super admin or has system role - they have access to everything
    if (user.isSuperAdmin || user.systemRole === SystemRole.SUPER_ADMIN) {
      this.logger.debug(`User ${user.id} is super admin - granting access`);
      return true;
    }

    // System admins also have org admin access
    if (user.systemRole === SystemRole.SYSTEM_ADMIN) {
      this.logger.debug(`User ${user.id} is system admin - granting access`);
      return true;
    }

    let userOrgRole = user.orgRole as OrgRole | undefined;

    // Check database for current org role (stored as platformRole in DB)
    if (user.id) {
      try {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            isSuperAdmin: true,
            systemRole: true,
            platformRole: true, // DB column is still platformRole
          },
        });

        // If user is super_admin in database, always grant access
        if (dbUser?.isSuperAdmin || dbUser?.systemRole === SystemRole.SUPER_ADMIN) {
          this.logger.log(`Granting access to user ${user.id} based on super_admin/systemRole in database`);
          return true;
        }

        // System admin also has access
        if (dbUser?.systemRole === SystemRole.SYSTEM_ADMIN) {
          this.logger.log(`Granting access to user ${user.id} based on system_admin role in database`);
          return true;
        }

        // Use platformRole from database as orgRole
        if (dbUser?.platformRole) {
          userOrgRole = dbUser.platformRole as OrgRole;
        }
      } catch (error) {
        // If database check fails, fall back to token-based check
        this.logger.warn(`Failed to check user role in database for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!userOrgRole) {
      this.logger.warn(`User ${user.id} (orgRole: ${user.orgRole}) does not have an org role. Required: ${requiredOrgRoles.join(' or ')}`);
      throw new ForbiddenException(
        `Access denied. Required org role: ${requiredOrgRoles.join(' or ')}`,
      );
    }

    // Org admin/owner has access to everything
    if (userOrgRole === OrgRole.ADMIN || userOrgRole === OrgRole.OWNER) {
      return true;
    }

    // Check if user org role is in required org roles
    if (!requiredOrgRoles.includes(userOrgRole)) {
      throw new ForbiddenException(
        `Access denied. Required org role: ${requiredOrgRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

// Export with old name for backward compatibility during migration
export { OrgRolesGuard as PlatformRolesGuard };
