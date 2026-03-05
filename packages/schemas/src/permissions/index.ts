import { z } from 'zod';

// Organization roles
export const OrgRoleSchema = z.enum(['ORG_OWNER', 'ORG_ADMIN', 'ORG_SUPPORT', 'ORG_VIEWER']);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

// Site roles
export const SiteRoleSchema = z.enum(['SITE_OWNER', 'SITE_ADMIN', 'SITE_EDITOR', 'SITE_DESIGNER', 'SITE_VIEWER']);
export type SiteRole = z.infer<typeof SiteRoleSchema>;

// Permission flag shapes
export type OrgPermissions = {
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

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, OrgPermissions> = {
  ORG_OWNER: {
    canManageSites: true,
    canManageBilling: true,
    canAccessDevPanel: true,
  },
  ORG_ADMIN: {
    canManageSites: true,
    canManageBilling: true,
    canAccessDevPanel: true,
  },
  ORG_SUPPORT: {
    canManageSites: true,
    canManageBilling: false,
    canAccessDevPanel: true,
  },
  ORG_VIEWER: {
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

export function combineOrgPermissions(roles: OrgRole | OrgRole[] | null | undefined): OrgPermissions {
  const roleList: OrgRole[] = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return roleList.reduce<OrgPermissions>(
    (acc, role) => ({
      canManageSites: acc.canManageSites || ORG_ROLE_PERMISSIONS[role]?.canManageSites || false,
      canManageBilling: acc.canManageBilling || ORG_ROLE_PERMISSIONS[role]?.canManageBilling || false,
      canAccessDevPanel: acc.canAccessDevPanel || ORG_ROLE_PERMISSIONS[role]?.canAccessDevPanel || false,
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

export type OrgPermissionFlag = keyof OrgPermissions;
export type SitePermissionFlag = keyof SitePermissions;
