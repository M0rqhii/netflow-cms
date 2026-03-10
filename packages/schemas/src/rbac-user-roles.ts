export type PublicRbacUserRoleScope = 'ORG' | 'SITE';

export type PublicRbacUserRoleKey =
  | 'org_admin'
  | 'org_member'
  | 'site_admin'
  | 'editor_in_chief'
  | 'editor'
  | 'publisher'
  | 'marketing_manager'
  | 'marketing_editor'
  | 'marketing_publisher'
  | 'marketing_viewer'
  | 'viewer';

export type PublicRbacUserRoleDefinition = {
  key: PublicRbacUserRoleKey;
  scope: PublicRbacUserRoleScope;
  roleName: string;
  legacyRole: string;
  legacySiteRole: string;
  legacyPlatformRole: string;
};

export const PUBLIC_RBAC_USER_ROLES: ReadonlyArray<PublicRbacUserRoleDefinition> = [
  {
    key: 'org_admin',
    scope: 'ORG',
    roleName: 'Org Admin',
    legacyRole: 'org_admin',
    legacySiteRole: 'admin',
    legacyPlatformRole: 'admin',
  },
  {
    key: 'org_member',
    scope: 'ORG',
    roleName: 'Org Member',
    legacyRole: 'viewer',
    legacySiteRole: 'viewer',
    legacyPlatformRole: 'user',
  },
  {
    key: 'site_admin',
    scope: 'SITE',
    roleName: 'Site Admin',
    legacyRole: 'org_admin',
    legacySiteRole: 'admin',
    legacyPlatformRole: 'admin',
  },
  {
    key: 'editor_in_chief',
    scope: 'SITE',
    roleName: 'Editor-in-Chief',
    legacyRole: 'editor-in-chief',
    legacySiteRole: 'editor-in-chief',
    legacyPlatformRole: 'user',
  },
  {
    key: 'editor',
    scope: 'SITE',
    roleName: 'Editor',
    legacyRole: 'editor',
    legacySiteRole: 'editor',
    legacyPlatformRole: 'user',
  },
  {
    key: 'publisher',
    scope: 'SITE',
    roleName: 'Publisher',
    legacyRole: 'editor-in-chief',
    legacySiteRole: 'editor-in-chief',
    legacyPlatformRole: 'user',
  },
  {
    key: 'marketing_manager',
    scope: 'SITE',
    roleName: 'Marketing Manager',
    legacyRole: 'marketing',
    legacySiteRole: 'marketing',
    legacyPlatformRole: 'user',
  },
  {
    key: 'marketing_editor',
    scope: 'SITE',
    roleName: 'Marketing Editor',
    legacyRole: 'marketing',
    legacySiteRole: 'marketing',
    legacyPlatformRole: 'user',
  },
  {
    key: 'marketing_publisher',
    scope: 'SITE',
    roleName: 'Marketing Publisher',
    legacyRole: 'marketing',
    legacySiteRole: 'marketing',
    legacyPlatformRole: 'user',
  },
  {
    key: 'marketing_viewer',
    scope: 'SITE',
    roleName: 'Marketing Viewer',
    legacyRole: 'marketing',
    legacySiteRole: 'marketing',
    legacyPlatformRole: 'user',
  },
  {
    key: 'viewer',
    scope: 'SITE',
    roleName: 'Viewer',
    legacyRole: 'viewer',
    legacySiteRole: 'viewer',
    legacyPlatformRole: 'user',
  },
] as const;

export function getPublicRbacUserRoles(scope?: PublicRbacUserRoleScope) {
  if (!scope) {
    return [...PUBLIC_RBAC_USER_ROLES];
  }
  return PUBLIC_RBAC_USER_ROLES.filter((role) => role.scope === scope);
}

export function getPublicRbacUserRole(key: string) {
  return PUBLIC_RBAC_USER_ROLES.find((role) => role.key === key);
}

export function getPublicRbacUserRoleByName(roleName: string, scope?: PublicRbacUserRoleScope) {
  return PUBLIC_RBAC_USER_ROLES.find(
    (role) => role.roleName === roleName && (!scope || role.scope === scope),
  );
}

export function coercePublicRbacUserRoleKey(
  rawRoleKey: string,
  scope?: PublicRbacUserRoleScope,
): PublicRbacUserRoleKey | null {
  const normalized = String(rawRoleKey || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exactMatch = getPublicRbacUserRole(normalized);
  if (exactMatch && (!scope || exactMatch.scope === scope)) {
    return exactMatch.key;
  }

  switch (normalized) {
    case 'org_admin':
      if (scope === 'SITE') return 'site_admin';
      return 'org_admin';
    case 'org_member':
      return scope === 'SITE' ? 'viewer' : 'org_member';
    case 'site_admin':
      if (scope === 'ORG') return 'org_admin';
      return 'site_admin';
    case 'admin':
      if (scope === 'ORG') return 'org_admin';
      if (scope === 'SITE') return 'site_admin';
      return null;
    case 'viewer':
      return scope === 'ORG' ? 'org_member' : 'viewer';
    case 'editor':
      return scope === 'ORG' ? null : 'editor';
    case 'editor-in-chief':
    case 'editor_in_chief':
      return scope === 'ORG' ? null : 'editor_in_chief';
    case 'publisher':
      return scope === 'ORG' ? null : 'publisher';
    case 'marketing':
    case 'marketing_manager':
      return scope === 'ORG' ? null : 'marketing_manager';
    case 'marketing_editor':
      return scope === 'ORG' ? null : 'marketing_editor';
    case 'marketing_publisher':
      return scope === 'ORG' ? null : 'marketing_publisher';
    case 'marketing_viewer':
      return scope === 'ORG' ? null : 'marketing_viewer';
    case 'owner':
      if (scope === 'ORG') return 'org_admin';
      if (scope === 'SITE') return 'site_admin';
      return null;
    default:
      return null;
  }
}
