import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '../roles.enum';
import { ORG_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { matchesRequiredOrgRole, resolveAuthorizationContext } from '../legacy-rbac-bridge';
import { isPlatformPowerUser } from '../platform-admin.util';
import { RbacService } from '../../../modules/rbac/rbac.service';

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
    private rbacService: RbacService,
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

    this.logger.debug(
      `Checking org role for user ${user.id} (orgRoleKey: ${user.orgRoleKey}, orgRoleName: ${user.orgRoleName}, platformRoles: ${(user.platformRbacRoles || []).join(',')})`,
    );

    // Check if user is super admin / platform admin - they have access to everything
    if (isPlatformPowerUser(user)) {
      this.logger.debug(`User ${user.id} is super admin - granting access`);
      return true;
    }

    const { orgId } = resolveAuthorizationContext(request, user);
    if (user.id && orgId) {
      const platformProfile = await this.rbacService.getEffectivePlatformProfile(user.id);
      if (platformProfile.isPlatformPowerUser) {
        this.logger.debug(`User ${user.id} has platform RBAC bypass - granting access`);
        return true;
      }

      const assignments = await this.rbacService.getAssignments(orgId, user.id);
      const assignedOrgRoles = new Set(
        assignments
          .filter((assignment) => assignment.role.scope === 'ORG' && !assignment.siteId)
          .map((assignment) => assignment.role.name),
      );

      if (assignedOrgRoles.has('Org Owner')) {
        return true;
      }

      if (
        assignedOrgRoles.has('Org Admin') &&
        requiredOrgRoles.some((role) =>
          [OrgRole.USER, OrgRole.EDITOR_IN_CHIEF, OrgRole.ADMIN].includes(role),
        )
      ) {
        return true;
      }

      if (assignedOrgRoles.has('Org Member') && requiredOrgRoles.includes(OrgRole.USER)) {
        return true;
      }
    }

    if (!matchesRequiredOrgRole(user, requiredOrgRoles)) {
      this.logger.warn(`User ${user.id} (orgRoleKey: ${user.orgRoleKey}, orgRoleName: ${user.orgRoleName}) does not have an org role. Required: ${requiredOrgRoles.join(' or ')}`);
      throw new ForbiddenException(
        `Access denied. Required org role: ${requiredOrgRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

// Export with old name for backward compatibility during migration
export { OrgRolesGuard as PlatformRolesGuard };
