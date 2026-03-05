import { Injectable } from '@nestjs/common';
import {
  combineOrgPermissions,
  combineSitePermissions,
  OrgPermissionFlag,
  OrgPermissions,
  OrgRole,
  SitePermissionFlag,
  SitePermissions,
  SiteRole,
} from '@repo/schemas';

@Injectable()
export class PermissionsService {
  resolveOrgPermissions(roleOrRoles: OrgRole | OrgRole[] | null | undefined): OrgPermissions {
    return combineOrgPermissions(roleOrRoles);
  }

  resolveSitePermissions(roleOrRoles: SiteRole | SiteRole[] | null | undefined): SitePermissions {
    return combineSitePermissions(roleOrRoles);
  }

  hasOrgPermission(perms: OrgPermissions, flag: OrgPermissionFlag): boolean {
    return Boolean(perms?.[flag]);
  }

  hasSitePermission(perms: SitePermissions, flag: SitePermissionFlag): boolean {
    return Boolean(perms?.[flag]);
  }
}
