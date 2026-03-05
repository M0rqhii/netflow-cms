import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, SiteRole, SystemRole, hasSitePermission } from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { CollectionRolesService } from '../../../modules/collection-roles/collection-roles.service';

/**
 * CollectionPermissionsGuard - checks permissions per collection
 * AI Note: Checks both site-level permissions and collection-specific roles
 *
 * Usage:
 * @CollectionPermissions('collectionId', Permission.ITEMS_CREATE)
 *
 * This guard:
 * 1. Checks if user is super admin first
 * 2. Checks site-level permissions (SiteRole-based)
 * 3. If collectionId is provided, checks collection-specific roles
 * 4. Allows access if any check passes
 */
@Injectable()
export class CollectionPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private collectionRolesService: CollectionRolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const siteId = request.siteId || user.siteId;

    // Super admin has all permissions
    if (user.isSuperAdmin || user.systemRole === SystemRole.SUPER_ADMIN) {
      return true;
    }

    // Check site-level permissions based on siteRole
    if (user.siteRole) {
      const userSiteRole = user.siteRole as SiteRole;
      const hasSitePerm = requiredPermissions.some(perm => hasSitePermission(userSiteRole, perm));
      if (hasSitePerm) {
        return true;
      }
    }

    // If collectionId is in params/body, check collection-specific permissions
    const collectionId = request.params?.collectionId || request.body?.collectionId;
    if (collectionId && siteId) {
      // Map permissions to collection role requirements
      const requiredRole = this.mapPermissionToCollectionRole(requiredPermissions[0]);
      if (requiredRole) {
        const hasCollectionPermission = await this.collectionRolesService.hasCollectionPermission(
          siteId,
          collectionId,
          user.id,
          requiredRole,
        );
        if (hasCollectionPermission) {
          return true;
        }
      }
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
    );
  }

  /**
   * Map permission to collection role requirement
   */
  private mapPermissionToCollectionRole(permission: Permission): 'viewer' | 'editor' | 'admin' | null {
    // Read permissions require viewer role
    if (permission.includes(':read')) {
      return 'viewer';
    }
    
    // Create/update permissions require editor role
    if (permission.includes(':create') || permission.includes(':update') || permission.includes(':write')) {
      return 'editor';
    }
    
    // Delete/publish permissions require admin role
    if (permission.includes(':delete') || permission.includes(':publish')) {
      return 'admin';
    }
    
    return null;
  }
}

