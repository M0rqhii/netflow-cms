import { z } from 'zod';

// Platform roles
export const PlatformRoleSchema = z.enum(['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER']);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

// Site roles
export const SiteRoleSchema = z.enum(['SITE_OWNER', 'SITE_ADMIN', 'SITE_EDITOR', 'SITE_DESIGNER', 'SITE_VIEWER']);
export type SiteRole = z.infer<typeof SiteRoleSchema>;

// Permission flag shapes
export type PlatformPermissions = {
  canManageSites: boolean;
  canManageBilling: boolean;
  canAccessDevPanel: boolean;
};

export type SitePermissions = {
  canEditPages: boolean;
  canPublishPages: boolean;
  canManageContent: boolean;
  canManageMedia: boolean;
  canEditSeo: boolean;
  canAccessPageBuilder: boolean;
  canManageSiteUsers: boolean;
};

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermissions> = {
  PLATFORM_OWNER: {
    canManageSites: true,
    canManageBilling: true,
    canAccessDevPanel: true,
  },
  PLATFORM_ADMIN: {
    canManageSites: true,
    canManageBilling: true,
    canAccessDevPanel: true,
  },
  PLATFORM_SUPPORT: {
    canManageSites: true,
    canManageBilling: false,
    canAccessDevPanel: true,
  },
  PLATFORM_VIEWER: {
    canManageSites: false,
    canManageBilling: false,
    canAccessDevPanel: false,
  },
};

export const SITE_ROLE_PERMISSIONS: Record<SiteRole, SitePermissions> = {
  SITE_OWNER: {
    canEditPages: true,
    canPublishPages: true,
    canManageContent: true,
    canManageMedia: true,
    canEditSeo: true,
    canAccessPageBuilder: true,
    canManageSiteUsers: true,
  },
  SITE_ADMIN: {
    canEditPages: true,
    canPublishPages: true,
    canManageContent: true,
    canManageMedia: true,
    canEditSeo: true,
    canAccessPageBuilder: true,
    canManageSiteUsers: true,
  },
  SITE_EDITOR: {
    canEditPages: true,
    canPublishPages: true,
    canManageContent: true,
    canManageMedia: true,
    canEditSeo: false,
    canAccessPageBuilder: false,
    canManageSiteUsers: false,
  },
  SITE_DESIGNER: {
    canEditPages: true,
    canPublishPages: false,
    canManageContent: false,
    canManageMedia: true,
    canEditSeo: true,
    canAccessPageBuilder: true,
    canManageSiteUsers: false,
  },
  SITE_VIEWER: {
    canEditPages: false,
    canPublishPages: false,
    canManageContent: false,
    canManageMedia: false,
    canEditSeo: false,
    canAccessPageBuilder: false,
    canManageSiteUsers: false,
  },
};

export function combinePlatformPermissions(roles: PlatformRole | PlatformRole[] | null | undefined): PlatformPermissions {
  const roleList: PlatformRole[] = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return roleList.reduce<PlatformPermissions>(
    (acc, role) => ({
      canManageSites: acc.canManageSites || PLATFORM_ROLE_PERMISSIONS[role]?.canManageSites || false,
      canManageBilling: acc.canManageBilling || PLATFORM_ROLE_PERMISSIONS[role]?.canManageBilling || false,
      canAccessDevPanel: acc.canAccessDevPanel || PLATFORM_ROLE_PERMISSIONS[role]?.canAccessDevPanel || false,
    }),
    { canManageSites: false, canManageBilling: false, canAccessDevPanel: false },
  );
}

export function combineSitePermissions(roles: SiteRole | SiteRole[] | null | undefined): SitePermissions {
  const roleList: SiteRole[] = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return roleList.reduce<SitePermissions>(
    (acc, role) => ({
      canEditPages: acc.canEditPages || SITE_ROLE_PERMISSIONS[role]?.canEditPages || false,
      canPublishPages: acc.canPublishPages || SITE_ROLE_PERMISSIONS[role]?.canPublishPages || false,
      canManageContent: acc.canManageContent || SITE_ROLE_PERMISSIONS[role]?.canManageContent || false,
      canManageMedia: acc.canManageMedia || SITE_ROLE_PERMISSIONS[role]?.canManageMedia || false,
      canEditSeo: acc.canEditSeo || SITE_ROLE_PERMISSIONS[role]?.canEditSeo || false,
      canAccessPageBuilder: acc.canAccessPageBuilder || SITE_ROLE_PERMISSIONS[role]?.canAccessPageBuilder || false,
      canManageSiteUsers: acc.canManageSiteUsers || SITE_ROLE_PERMISSIONS[role]?.canManageSiteUsers || false,
    }),
    {
      canEditPages: false,
      canPublishPages: false,
      canManageContent: false,
      canManageMedia: false,
      canEditSeo: false,
      canAccessPageBuilder: false,
      canManageSiteUsers: false,
    },
  );
}

export type PlatformPermissionFlag = keyof PlatformPermissions;
export type SitePermissionFlag = keyof SitePermissions;
