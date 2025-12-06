import {
  combinePlatformPermissions,
  combineSitePermissions,
  PlatformPermissions,
  PlatformRole,
  SitePermissions,
  SiteRole,
} from '@repo/schemas/permissions';

type PlatformUserLike = {
  platformRole?: PlatformRole;
  platformRoles?: PlatformRole[];
  roles?: PlatformRole[]; // fallback alias
};

type SiteMembership = { siteId: string; role: SiteRole; roles?: SiteRole[] };

type SiteUserLike = {
  memberships?: SiteMembership[];
  sites?: SiteMembership[]; // alias
};

export function getUserPlatformPermissions(user: PlatformUserLike | null | undefined): PlatformPermissions {
  const roles: PlatformRole[] =
    (user?.platformRoles as PlatformRole[]) ||
    (user?.roles as PlatformRole[]) ||
    (user?.platformRole ? [user.platformRole] : []);
  return combinePlatformPermissions(roles);
}

export function getUserSitePermissions(user: (PlatformUserLike & SiteUserLike) | null | undefined, siteId: string): SitePermissions {
  const membership =
    user?.memberships?.find((m) => m.siteId === siteId) ||
    user?.sites?.find((m) => m.siteId === siteId);
  const roles: SiteRole[] = (membership?.roles as SiteRole[]) || (membership?.role ? [membership.role] : []);
  return combineSitePermissions(roles);
}
