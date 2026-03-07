/**
 * Role definitions for RBAC system
 * AI Note: 
 * - Site Role: rola w konkretnym site/organizacji (od najmniejszych do największych praw)
 * - Platform Role: rola na poziomie platformy/organizacji (user jest najniższą!)
 * - System Role: role systemowe (admin/dev) - poza hierarchią
 */

/**
 * Site Role - rola w konkretnym site/organizacji
 * Kolejność: od najmniejszych do największych praw
 */
export enum SiteRole {
  VIEWER = 'viewer',                    // Najmniejsze prawa - tylko odczyt
  EDITOR = 'editor',                    // Może edytować treść
  EDITOR_IN_CHIEF = 'editor-in-chief', // Może recenzować i publikować
  MARKETING = 'marketing',              // Może zarządzać marketingiem
  ADMIN = 'admin',                     // Może zarządzać użytkownikami i treścią
  OWNER = 'owner',                     // Największe prawa - właściciel site
}

/**
 * Org Role - rola na poziomie organizacji
 * Kolejność: od najmniejszych do największych praw
 * UWAGA: user jest najniższą rolą!
 */
export enum OrgRole {
  USER = 'user',                       // Najniższa rola - zwykły użytkownik
  EDITOR_IN_CHIEF = 'editor-in-chief', // Może recenzować treść na platformie
  ADMIN = 'admin',                     // Może zarządzać organizacją
  OWNER = 'owner',                     // Właściciel organizacji
}

/**
 * System Role - role systemowe (admin/dev)
 * Te role są poza hierarchią site/platform
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',         // Najwyższa rola systemowa - pełny dostęp
  SYSTEM_ADMIN = 'system_admin',       // Administrator systemu
  SYSTEM_DEV = 'system_dev',           // Developer systemu
  SYSTEM_SUPPORT = 'system_support',   // Support systemu
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
  
  // Organization management
  ORGANIZATIONS_READ = 'organizations:read',
  ORGANIZATIONS_WRITE = 'organizations:write',
  ORGANIZATIONS_DELETE = 'organizations:delete',
  
  // Site management
  SITES_READ = 'sites:read',
  SITES_WRITE = 'sites:write',
  SITES_DELETE = 'sites:delete',
  
  // Collections
  COLLECTIONS_READ = 'collections:read',
  COLLECTIONS_CREATE = 'collections:create',
  COLLECTIONS_UPDATE = 'collections:update',
  COLLECTIONS_DELETE = 'collections:delete',
  COLLECTIONS_WRITE = 'collections:write', // Alias for create+update (backward compatibility)
  
  // Collection Items
  ITEMS_READ = 'items:read',
  ITEMS_CREATE = 'items:create',
  ITEMS_UPDATE = 'items:update',
  ITEMS_DELETE = 'items:delete',
  ITEMS_PUBLISH = 'items:publish',
  ITEMS_WRITE = 'items:write', // Alias for create+update (backward compatibility)
  
  // Content Types
  CONTENT_TYPES_READ = 'content_types:read',
  CONTENT_TYPES_CREATE = 'content_types:create',
  CONTENT_TYPES_UPDATE = 'content_types:update',
  CONTENT_TYPES_DELETE = 'content_types:delete',
  CONTENT_TYPES_WRITE = 'content_types:write', // Alias for create+update (backward compatibility)
  
  // Content Entries
  CONTENT_READ = 'content:read',
  CONTENT_CREATE = 'content:create',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  CONTENT_REVIEW = 'content:review', // Review and approve/reject content
  CONTENT_COMMENT = 'content:comment', // Add comments to content
  CONTENT_WRITE = 'content:write', // Alias for create+update (backward compatibility)
  
  // Media
  MEDIA_READ = 'media:read',
  MEDIA_WRITE = 'media:write',
  MEDIA_DELETE = 'media:delete',
  
  // Billing
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  
  // Site Panel: Environments & Pages
  PAGES_READ = 'pages:read',
  PAGES_WRITE = 'pages:write',
  PAGES_PUBLISH = 'pages:publish',
  ENVIRONMENTS_MANAGE = 'environments:manage',
  
  // System permissions (tylko dla system roles)
  SYSTEM_ACCESS = 'system:access',
  SYSTEM_MANAGE = 'system:manage',
  SYSTEM_DEBUG = 'system:debug',
}

/**
 * Site Role Permissions - przywileje dla ról w site
 * Kolejność: od najmniejszych do największych praw
 */
export const SITE_ROLE_PERMISSIONS: Record<SiteRole, Permission[]> = {
  [SiteRole.VIEWER]: [
    // Tylko odczyt
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_READ,
    Permission.MEDIA_READ,
    Permission.PAGES_READ,
  ],
  
  [SiteRole.EDITOR]: [
    // Wszystko z VIEWER +
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_WRITE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_COMMENT,
    Permission.CONTENT_WRITE,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
    Permission.PAGES_READ,
    Permission.PAGES_WRITE,
  ],
  
  [SiteRole.EDITOR_IN_CHIEF]: [
    // Wszystko z EDITOR +
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_WRITE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_COMMENT,
    Permission.CONTENT_WRITE,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
    Permission.PAGES_READ,
    Permission.PAGES_WRITE,
    Permission.ITEMS_PUBLISH,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_REVIEW,
    Permission.PAGES_PUBLISH,
  ],
  
  [SiteRole.MARKETING]: [
    // Wszystko z EDITOR_IN_CHIEF +
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_PUBLISH,
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_PUBLISH,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
    Permission.PAGES_READ,
    Permission.PAGES_WRITE,
    Permission.PAGES_PUBLISH,
  ],

  [SiteRole.ADMIN]: [
    // Wszystko z MARKETING +
    Permission.COLLECTIONS_READ,
    Permission.ITEMS_READ,
    Permission.ITEMS_CREATE,
    Permission.ITEMS_UPDATE,
    Permission.ITEMS_WRITE,
    Permission.ITEMS_PUBLISH,
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_COMMENT,
    Permission.MEDIA_READ,
    Permission.MEDIA_WRITE,
    Permission.PAGES_READ,
    Permission.PAGES_WRITE,
    Permission.PAGES_PUBLISH,
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.COLLECTIONS_CREATE,
    Permission.COLLECTIONS_UPDATE,
    Permission.COLLECTIONS_DELETE,
    Permission.COLLECTIONS_WRITE,
    Permission.ITEMS_DELETE,
    Permission.CONTENT_TYPES_READ,
    Permission.CONTENT_TYPES_CREATE,
    Permission.CONTENT_TYPES_UPDATE,
    Permission.CONTENT_TYPES_DELETE,
    Permission.CONTENT_TYPES_WRITE,
    Permission.CONTENT_DELETE,
    Permission.MEDIA_DELETE,
    Permission.ENVIRONMENTS_MANAGE,
    // UWAGA: SITES_READ/WRITE s� tylko dla PlatformRole, nie SiteRole
    // SiteRole.ADMIN zarz�dza tre�ci� w site, nie tworzy nowych sites
  ],
  
  [SiteRole.OWNER]: [
    // Wszystkie uprawnienia w site
    ...Object.values(Permission).filter(p => 
      !p.startsWith('system:') && 
      !p.startsWith('organizations:')
    ),
  ],
};

/**
 * Org Role Permissions - przywileje dla ról organizacyjnych
 * Kolejność: od najmniejszych do największych praw
 * UWAGA: user jest najniższą rolą!
 */
export const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  [OrgRole.USER]: [
    // Najniższa rola - brak uprawnień organizacyjnych
    // Ma tylko uprawnienia z Site Role
  ],

  [OrgRole.EDITOR_IN_CHIEF]: [
    // Może recenzować treść na poziomie organizacji
    Permission.CONTENT_REVIEW,
    Permission.CONTENT_READ,
    Permission.CONTENT_UPDATE,
  ],

  [OrgRole.ADMIN]: [
    // Może zarządzać organizacją
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.ORGANIZATIONS_READ,
    Permission.SITES_READ,
    Permission.SITES_WRITE,
    Permission.SITES_DELETE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
  ],

  [OrgRole.OWNER]: [
    // Właściciel organizacji - pełny dostęp do organizacji
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.SITES_READ,
    Permission.SITES_WRITE,
    Permission.SITES_DELETE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_WRITE,
  ],
};

/**
 * System Role Permissions - przywileje dla ról systemowych
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.SUPER_ADMIN]: [
    // Najwyższa rola - wszystkie uprawnienia
    ...Object.values(Permission),
  ],
  
  [SystemRole.SYSTEM_ADMIN]: [
    // Administrator systemu - zarządzanie platformą
    Permission.SYSTEM_ACCESS,
    Permission.SYSTEM_MANAGE,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_WRITE,
    Permission.ORGANIZATIONS_DELETE,
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.SITES_READ,
    Permission.SITES_WRITE,
    Permission.SITES_DELETE,
    ...Object.values(Permission).filter(p => 
      p.startsWith('content:') || 
      p.startsWith('collections:') ||
      p.startsWith('media:')
    ),
  ],
  
  [SystemRole.SYSTEM_DEV]: [
    // Developer systemu - dostęp do debugowania
    Permission.SYSTEM_ACCESS,
    Permission.SYSTEM_DEBUG,
    Permission.ORGANIZATIONS_READ,
    Permission.SITES_READ,
    Permission.USERS_READ,
    Permission.CONTENT_READ,
    Permission.COLLECTIONS_READ,
  ],
  
  [SystemRole.SYSTEM_SUPPORT]: [
    // Support systemu - pomoc użytkownikom
    Permission.SYSTEM_ACCESS,
    Permission.ORGANIZATIONS_READ,
    Permission.USERS_READ,
    Permission.SITES_READ,
    Permission.CONTENT_READ,
    Permission.COLLECTIONS_READ,
  ],
};


/**
 * Sprawdź czy rola ma uprawnienie (Site Role)
 */
export function hasSitePermission(role: SiteRole, permission: Permission): boolean {
  const permissions = SITE_ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Sprawdź czy rola ma uprawnienie (Org Role)
 */
export function hasOrgPermission(orgRole: OrgRole, permission: Permission): boolean {
  const permissions = ORG_ROLE_PERMISSIONS[orgRole] || [];
  return permissions.includes(permission);
}

/**
 * Sprawdź czy rola ma którekolwiek z uprawnień (Org Role)
 */
export function hasAnyOrgPermission(orgRole: OrgRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasOrgPermission(orgRole, permission));
}

/**
 * Sprawdź czy rola ma wszystkie uprawnienia (Org Role)
 */
export function hasAllOrgPermissions(orgRole: OrgRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasOrgPermission(orgRole, permission));
}

/**
 * Sprawdź czy rola ma uprawnienie (System Role)
 */
export function hasSystemPermission(systemRole: SystemRole, permission: Permission): boolean {
  if (systemRole === SystemRole.SUPER_ADMIN) {
    return true; // Super admin ma wszystkie uprawnienia
  }
  const permissions = SYSTEM_ROLE_PERMISSIONS[systemRole] || [];
  return permissions.includes(permission);
}








