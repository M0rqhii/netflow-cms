import { Permissions } from '@repo/schemas';

type PlatformRole = Permissions.OrgRole;
type SiteRole = Permissions.SiteRole;
type PlatformPermissions = Permissions.OrgPermissions;
type SitePermissions = Permissions.SitePermissions;

const { combineOrgPermissions, combineSitePermissions } = Permissions;


type PlatformUserLike = {
  platformRole?: PlatformRole;
  platformRoles?: PlatformRole[];
  orgRole?: PlatformRole;
  orgRoles?: PlatformRole[];
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
    (user?.orgRoles as PlatformRole[]) ||
    (user?.roles as PlatformRole[]) ||
    (user?.platformRole ? [user.platformRole] : user?.orgRole ? [user.orgRole] : []);
  return combineOrgPermissions(roles);
}

export function getUserSitePermissions(user: (PlatformUserLike & SiteUserLike) | null | undefined, siteId: string): SitePermissions {
  const membership =
    user?.memberships?.find((m) => m.siteId === siteId) ||
    user?.sites?.find((m) => m.siteId === siteId);
  const roles: SiteRole[] = (membership?.roles as SiteRole[]) || (membership?.role ? [membership.role] : []);
  return combineSitePermissions(roles);
}
