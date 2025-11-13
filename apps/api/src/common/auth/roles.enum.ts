/**
 * Role definitions for RBAC system
 * AI Note: Role hierarchy: super_admin > tenant_admin > editor > viewer
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Platform roles - roles that apply to the entire platform, not just a tenant
 * AI Note: Platform roles are separate from tenant roles
 */
export enum PlatformRole {
  PLATFORM_ADMIN = 'platform_admin', // Full access to platform (create tenants, manage all users)
  ORG_OWNER = 'org_owner',            // Owner of an organization (can manage their tenants)
  USER = 'user',                      // Regular user (no platform-level permissions)
}

/**
 * Permission definitions - granular permissions for resources
 * AI Note: Format: {resource}:{action} (e.g., 'users:read', 'collections:write')
 */
export enum Permission {
  // User management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',
  
  // Tenant management (only for super_admin)
  TENANTS_READ = 'tenants:read',
  TENANTS_WRITE = 'tenants:write',
  TENANTS_DELETE = 'tenants:delete',
  
  // Collections
  COLLECTIONS_READ = 'collections:read',
  COLLECTIONS_WRITE = 'collections:write',
  COLLECTIONS_DELETE = 'collections:delete',
  
  // Collection Items
  ITEMS_READ = 'items:read',
  ITEMS_WRITE = 'items:write',
  ITEMS_DELETE = 'items:delete',
  ITEMS_PUBLISH = 'items:publish',
  
  // Content Types
  CONTENT_TYPES_READ = 'content_types:read',
  CONTENT_TYPES_WRITE = 'content_types:write',
  CONTENT_TYPES_DELETE = 'content_types:delete',
  
  // Content Entries
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  
  // Media
  MEDIA_READ = 'media:read',
  MEDIA_WRITE = 'media:write',
  MEDIA_DELETE = 'media:delete',
}

/**
 * Role to Permissions mapping
 * AI Note: Each role has a set of permissions. Super admin has all permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(Permission),
  ],
  
  [Role.TENANT_ADMIN]: [
    // Tenant admin can manage users and all content within their tenant
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.COLLECTIONS_READ,
    Permission.COLLECTIONS_WRITE,
    Permission.COLLECTIONS_DELETE,
    Permission.ITEMS_READ,
    Permission.ITEMS_WRITE,
    Permission.ITEMS_DELETE,
    Permission.ITEMS_PUBLISH,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_TYPES_WRITE,
    Permission.CONTENT_TYPES_DELETE,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
    Permission.MEDIA_DELETE,
  ],
  
  [Role.EDITOR]: [
    // Editor can create and edit content but not manage users
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.ITEMS_WRITE,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
  ],
  
  [Role.VIEWER]: [
    // Viewer can only read content
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_READ,
    Permission.MEDIA_READ,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Platform Role Permissions - permissions for platform-level operations
 * AI Note: Platform roles control access to platform-wide operations (create tenants, manage users across tenants)
 */
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  [PlatformRole.PLATFORM_ADMIN]: [
    // Platform admin has all permissions including tenant management
    ...Object.values(Permission),
    Permission.TENANTS_READ,
    Permission.TENANTS_WRITE,
    Permission.TENANTS_DELETE,
  ],
  
  [PlatformRole.ORG_OWNER]: [
    // Org owner can manage their own tenants and users
    Permission.TENANTS_READ,
    Permission.TENANTS_WRITE,
    Permission.USERS_READ,
    Permission.USERS_WRITE,
  ],
  
  [PlatformRole.USER]: [
    // Regular user has no platform-level permissions
    // They only have tenant-level permissions based on their tenant role
  ],
};

/**
 * Check if a platform role has a specific permission
 */
export function hasPlatformPermission(platformRole: PlatformRole, permission: Permission): boolean {
  const permissions = PLATFORM_ROLE_PERMISSIONS[platformRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if a platform role has any of the specified permissions
 */
export function hasAnyPlatformPermission(platformRole: PlatformRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPlatformPermission(platformRole, permission));
}

/**
 * Check if a platform role has all of the specified permissions
 */
export function hasAllPlatformPermissions(platformRole: PlatformRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPlatformPermission(platformRole, permission));
}


