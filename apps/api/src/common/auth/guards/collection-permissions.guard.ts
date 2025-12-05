import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, hasAnyPermission } from '../roles.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { CollectionRolesService } from '../../../modules/collection-roles/collection-roles.service';

/**
 * CollectionPermissionsGuard - checks permissions per collection
 * AI Note: Checks both tenant-level permissions and collection-specific roles
 * 
 * Usage:
 * @CollectionPermissions('collectionId', Permission.ITEMS_CREATE)
 * 
 * This guard:
 * 1. Checks tenant-level permissions first (Role-based)
 * 2. If collectionId is provided, checks collection-specific roles
 * 3. Allows access if either check passes
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

    const userRole = user.role as Role;
    const tenantId = request.tenantId || user.tenantId;

    // Check tenant-level permissions first
    const hasTenantPermission = hasAnyPermission(userRole, requiredPermissions);
    if (hasTenantPermission) {
      return true;
    }

    // If collectionId is in params/body, check collection-specific permissions
    const collectionId = request.params?.collectionId || request.body?.collectionId;
    if (collectionId && tenantId) {
      // Map permissions to collection role requirements
      const requiredRole = this.mapPermissionToCollectionRole(requiredPermissions[0]);
      if (requiredRole) {
        const hasCollectionPermission = await this.collectionRolesService.hasCollectionPermission(
          tenantId,
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

