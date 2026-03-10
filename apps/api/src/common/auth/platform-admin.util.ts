type RoleCarrier = {
  platformRbacRoles?: string[] | null;
  isSuperAdmin?: boolean | null;
};

export type PlatformAccessProfile = {
  roleNames: string[];
  isPlatformRoot: boolean;
  isPlatformAdmin: boolean;
  isPlatformDeveloper: boolean;
  isPlatformSupport: boolean;
  isPlatformPowerUser: boolean;
  legacyRole?: string;
  legacyPlatformRole?: string;
  legacySystemRole?: string;
  isSuperAdmin: boolean;
};

function normalizeRoleNames(values: string[] | null | undefined): string[] {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

function rawRoleNames(values: string[] | null | undefined): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
}

export function hasPlatformRoleName(
  user: RoleCarrier | null | undefined,
  roleName: string,
): boolean {
  if (!user) return false;
  const normalizedTarget = String(roleName || '').trim().toLowerCase();
  return normalizeRoleNames(user.platformRbacRoles).includes(normalizedTarget);
}

export function hasAnyPlatformRoleName(
  user: RoleCarrier | null | undefined,
  roleNames: Iterable<string>,
): boolean {
  if (!user) return false;
  const assigned = new Set(normalizeRoleNames(user.platformRbacRoles));
  for (const roleName of roleNames) {
    if (assigned.has(String(roleName || '').trim().toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function getPlatformAccessProfile(user: RoleCarrier | null | undefined): PlatformAccessProfile {
  const roleNames = rawRoleNames(user?.platformRbacRoles);
  const normalizedAssigned = new Set(normalizeRoleNames(user?.platformRbacRoles));

  const isPlatformRoot =
    Boolean(user?.isSuperAdmin) ||
    normalizedAssigned.has('platform root');

  const isPlatformAdmin =
    !isPlatformRoot &&
    normalizedAssigned.has('platform admin');

  const isPlatformDeveloper =
    !isPlatformRoot &&
    !isPlatformAdmin &&
    normalizedAssigned.has('platform developer');

  const isPlatformSupport =
    !isPlatformRoot &&
    !isPlatformAdmin &&
    !isPlatformDeveloper &&
    normalizedAssigned.has('platform support');

  return {
    roleNames,
    isPlatformRoot,
    isPlatformAdmin,
    isPlatformDeveloper,
    isPlatformSupport,
    isPlatformPowerUser: isPlatformRoot || isPlatformAdmin,
    legacyRole: isPlatformRoot ? 'super_admin' : isPlatformAdmin ? 'platform_admin' : undefined,
    legacyPlatformRole: isPlatformRoot || isPlatformAdmin ? 'platform_admin' : undefined,
    legacySystemRole: isPlatformRoot
      ? 'super_admin'
      : isPlatformAdmin
        ? 'system_admin'
        : isPlatformDeveloper
          ? 'system_dev'
          : isPlatformSupport
            ? 'system_support'
            : undefined,
    isSuperAdmin: isPlatformRoot,
  };
}

export function isPlatformPowerUser(user: RoleCarrier | null | undefined): boolean {
  return getPlatformAccessProfile(user).isPlatformPowerUser;
}

export function canAccessPlatformDevTools(user: RoleCarrier | null | undefined): boolean {
  const profile = getPlatformAccessProfile(user);
  return profile.isPlatformPowerUser || profile.isPlatformDeveloper;
}
