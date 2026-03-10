import { CurrentUserPayload } from './decorators/current-user.decorator';
import { Permission, SiteRole } from './roles.enum';
import { OrgRole } from './roles.enum';
import { coercePublicRbacUserRoleKey, type PublicRbacUserRoleKey } from '@repo/schemas';

type RequestLike = {
  orgId?: unknown;
  siteId?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolveRoleName(
  explicitName: unknown,
  explicitKey: unknown,
  scope: 'ORG' | 'SITE',
): { key?: PublicRbacUserRoleKey; name?: string } {
  const name = asNonEmptyString(explicitName);
  const keyFromPayload =
    typeof explicitKey === 'string' ? coercePublicRbacUserRoleKey(explicitKey, scope) : null;
  if (keyFromPayload) {
    return { key: keyFromPayload, name };
  }
  return { name };
}

const PERMISSION_CAPABILITY_CANDIDATES: Partial<Record<Permission, string[]>> = {
  [Permission.USERS_READ]: ['platform.users.view', 'org.users.view'],
  [Permission.USERS_WRITE]: ['platform.users.manage', 'org.users.invite', 'org.users.remove'],
  [Permission.USERS_DELETE]: ['platform.users.manage', 'org.users.remove'],
  [Permission.ORGANIZATIONS_READ]: ['platform.organizations.view', 'org.view_dashboard'],
  [Permission.ORGANIZATIONS_WRITE]: ['platform.organizations.manage'],
  [Permission.ORGANIZATIONS_DELETE]: ['platform.organizations.manage'],
  [Permission.SITES_READ]: ['platform.organizations.view', 'sites.view'],
  [Permission.SITES_WRITE]: ['platform.organizations.manage', 'sites.create', 'sites.settings.manage'],
  [Permission.SITES_DELETE]: ['platform.organizations.manage', 'sites.delete'],
  [Permission.COLLECTIONS_READ]: ['builder.view', 'content.view'],
  [Permission.COLLECTIONS_CREATE]: ['builder.edit', 'content.create'],
  [Permission.COLLECTIONS_UPDATE]: ['builder.edit', 'content.edit'],
  [Permission.COLLECTIONS_DELETE]: ['sites.settings.manage', 'content.delete'],
  [Permission.COLLECTIONS_WRITE]: ['builder.edit', 'content.create', 'content.edit'],
  [Permission.ITEMS_READ]: ['content.view'],
  [Permission.ITEMS_CREATE]: ['content.create'],
  [Permission.ITEMS_UPDATE]: ['content.edit'],
  [Permission.ITEMS_DELETE]: ['content.delete'],
  [Permission.ITEMS_PUBLISH]: ['content.publish'],
  [Permission.ITEMS_WRITE]: ['content.create', 'content.edit'],
  [Permission.CONTENT_TYPES_READ]: ['builder.view'],
  [Permission.CONTENT_TYPES_CREATE]: ['builder.edit'],
  [Permission.CONTENT_TYPES_UPDATE]: ['builder.edit'],
  [Permission.CONTENT_TYPES_DELETE]: ['sites.settings.manage'],
  [Permission.CONTENT_TYPES_WRITE]: ['builder.edit'],
  [Permission.CONTENT_READ]: ['content.view'],
  [Permission.CONTENT_CREATE]: ['content.create'],
  [Permission.CONTENT_UPDATE]: ['content.edit'],
  [Permission.CONTENT_DELETE]: ['content.delete'],
  [Permission.CONTENT_PUBLISH]: ['content.publish'],
  [Permission.CONTENT_REVIEW]: ['content.publish'],
  [Permission.CONTENT_COMMENT]: ['content.edit'],
  [Permission.CONTENT_WRITE]: ['content.create', 'content.edit'],
  [Permission.MEDIA_READ]: ['content.media.manage', 'builder.view'],
  [Permission.MEDIA_WRITE]: ['content.media.manage', 'builder.assets.upload'],
  [Permission.MEDIA_DELETE]: ['content.media.manage', 'builder.assets.delete'],
  [Permission.BILLING_READ]: ['platform.billing.view', 'billing.view_plan', 'billing.view_invoices'],
  [Permission.BILLING_WRITE]: ['platform.billing.manage', 'billing.change_plan', 'billing.manage_payment_methods'],
  [Permission.PAGES_READ]: ['builder.view'],
  [Permission.PAGES_WRITE]: ['builder.edit', 'builder.draft.save'],
  [Permission.PAGES_PUBLISH]: ['builder.publish'],
  [Permission.ENVIRONMENTS_MANAGE]: ['sites.settings.manage', 'builder.publish'],
  [Permission.SYSTEM_ACCESS]: ['platform.dev.tools.access'],
  [Permission.SYSTEM_MANAGE]: ['platform.roles.manage', 'platform.feature_flags.manage', 'platform.organizations.manage'],
  [Permission.SYSTEM_DEBUG]: ['platform.dev.tools.access', 'platform.dev.logs.view', 'platform.dev.jobs.manage'],
};

const SITE_ROLE_CAPABILITY_CANDIDATES: Record<SiteRole, string[]> = {
  [SiteRole.VIEWER]: ['builder.view', 'content.view', 'marketing.view'],
  [SiteRole.EDITOR]: ['builder.edit', 'content.create', 'content.edit'],
  [SiteRole.EDITOR_IN_CHIEF]: ['builder.publish', 'content.publish'],
  [SiteRole.MARKETING]: ['marketing.content.edit', 'marketing.publish'],
  [SiteRole.ADMIN]: ['sites.settings.manage', 'builder.site_roles.manage', 'content.delete'],
  [SiteRole.OWNER]: ['billing.view_plan', 'org.roles.manage'],
};

export function resolveAuthorizationContext(
  request: RequestLike | undefined,
  user: CurrentUserPayload | undefined,
): { orgId?: string; siteId?: string } {
  const orgId =
    asNonEmptyString(request?.orgId) ??
    asNonEmptyString(user?.orgId) ??
    asNonEmptyString(request?.params?.orgId) ??
    asNonEmptyString(request?.query?.orgId) ??
    asNonEmptyString(request?.body?.orgId);

  const siteId =
    asNonEmptyString(request?.siteId) ??
    asNonEmptyString(user?.siteId) ??
    asNonEmptyString(request?.params?.siteId) ??
    asNonEmptyString(request?.query?.siteId) ??
    asNonEmptyString(request?.body?.siteId);

  return { orgId, siteId };
}

export function getCapabilityCandidatesForPermission(permission: Permission): string[] {
  return PERMISSION_CAPABILITY_CANDIDATES[permission] ?? [];
}

export function getCapabilityCandidatesForSiteRole(siteRole: SiteRole): string[] {
  return SITE_ROLE_CAPABILITY_CANDIDATES[siteRole] ?? [];
}

export function resolveEffectiveOrgRoleContext(user: CurrentUserPayload | undefined): {
  key?: PublicRbacUserRoleKey;
  name?: string;
} {
  if (!user) {
    return {};
  }

  return resolveRoleName(
    user.orgRoleName,
    user.orgRoleKey,
    'ORG',
  );
}

export function resolveEffectiveSiteRoleContext(user: CurrentUserPayload | undefined): {
  key?: PublicRbacUserRoleKey;
  name?: string;
} {
  if (!user) {
    return {};
  }

  return resolveRoleName(
    user.siteRoleName,
    user.siteRoleKey,
    'SITE',
  );
}

export function resolveLegacyOrgRole(user: CurrentUserPayload | undefined): OrgRole | undefined {
  const { key, name } = resolveEffectiveOrgRoleContext(user);
  const normalizedName = normalizeRole(name);
  if (normalizedName === 'org owner') {
    return OrgRole.OWNER;
  }
  if (normalizedName === 'org admin') {
    return OrgRole.ADMIN;
  }
  if (normalizedName === 'org member') {
    return OrgRole.USER;
  }

  switch (key) {
    case 'org_admin':
      return OrgRole.ADMIN;
    case 'org_member':
      return OrgRole.USER;
    default:
      return undefined;
  }
}

export function resolveLegacySiteRole(user: CurrentUserPayload | undefined): SiteRole | undefined {
  const { key, name } = resolveEffectiveSiteRoleContext(user);
  const normalizedName = normalizeRole(name);
  if (normalizedName === 'site admin') {
    return SiteRole.ADMIN;
  }
  if (normalizedName === 'editor-in-chief') {
    return SiteRole.EDITOR_IN_CHIEF;
  }
  if (normalizedName === 'editor') {
    return SiteRole.EDITOR;
  }
  if (normalizedName === 'marketing manager') {
    return SiteRole.MARKETING;
  }
  if (normalizedName === 'viewer' || normalizedName === 'publisher') {
    return SiteRole.VIEWER;
  }

  switch (key) {
    case 'site_admin':
      return SiteRole.ADMIN;
    case 'editor_in_chief':
      return SiteRole.EDITOR_IN_CHIEF;
    case 'editor':
      return SiteRole.EDITOR;
    case 'marketing_manager':
      return SiteRole.MARKETING;
    case 'publisher':
    case 'marketing_editor':
    case 'marketing_publisher':
    case 'marketing_viewer':
    case 'viewer':
      return SiteRole.VIEWER;
    default:
      return undefined;
  }
}

export function matchesRequiredOrgRole(
  user: CurrentUserPayload | undefined,
  requiredRoles: OrgRole[],
): boolean {
  const { name } = resolveEffectiveOrgRoleContext(user);
  const normalizedName = normalizeRole(name);

  if (normalizedName === 'org owner') {
    return true;
  }

  const effectiveRole = resolveLegacyOrgRole(user);
  if (!effectiveRole) {
    return false;
  }

  if (effectiveRole === OrgRole.ADMIN) {
    return requiredRoles.some((role) => role !== OrgRole.OWNER);
  }

  if (effectiveRole === OrgRole.EDITOR_IN_CHIEF) {
    return requiredRoles.includes(OrgRole.EDITOR_IN_CHIEF) || requiredRoles.includes(OrgRole.USER);
  }

  return requiredRoles.includes(effectiveRole);
}

export function matchesRequiredSiteRole(
  user: CurrentUserPayload | undefined,
  requiredRoles: SiteRole[],
): boolean {
  const { key, name } = resolveEffectiveSiteRoleContext(user);
  const normalizedName = normalizeRole(name);

  if (normalizedName === 'site owner') {
    return true;
  }

  if (key === 'site_admin' || normalizedName === 'site admin') {
    return requiredRoles.some((role) =>
      [SiteRole.VIEWER, SiteRole.EDITOR, SiteRole.EDITOR_IN_CHIEF, SiteRole.ADMIN].includes(role),
    );
  }

  if (key === 'editor_in_chief' || normalizedName === 'editor-in-chief') {
    return requiredRoles.some((role) =>
      [SiteRole.VIEWER, SiteRole.EDITOR, SiteRole.EDITOR_IN_CHIEF].includes(role),
    );
  }

  if (key === 'editor' || normalizedName === 'editor') {
    return requiredRoles.some((role) => [SiteRole.VIEWER, SiteRole.EDITOR].includes(role));
  }

  if (key === 'marketing_manager' || normalizedName === 'marketing manager') {
    return requiredRoles.includes(SiteRole.MARKETING) || requiredRoles.includes(SiteRole.VIEWER);
  }

  if (key === 'publisher' || normalizedName === 'publisher') {
    return requiredRoles.includes(SiteRole.VIEWER);
  }

  if (
    key === 'marketing_editor' ||
    key === 'marketing_publisher' ||
    key === 'marketing_viewer' ||
    normalizedName === 'marketing editor' ||
    normalizedName === 'marketing publisher' ||
    normalizedName === 'marketing viewer'
  ) {
    return requiredRoles.includes(SiteRole.VIEWER);
  }

  const effectiveRole = resolveLegacySiteRole(user);
  if (!effectiveRole) {
    return false;
  }

  if (effectiveRole === SiteRole.OWNER) {
    return true;
  }

  return requiredRoles.includes(effectiveRole);
}
