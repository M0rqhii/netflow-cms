import { Injectable } from '@nestjs/common';
import {
  combinePlatformPermissions,
  combineSitePermissions,
  PlatformPermissionFlag,
  PlatformPermissions,
  PlatformRole,
  SitePermissionFlag,
  SitePermissions,
  SiteRole,
} from '@repo/schemas';

@Injectable()
export class PermissionsService {
  resolvePlatformPermissions(roleOrRoles: PlatformRole | PlatformRole[] | null | undefined): PlatformPermissions {
    return combinePlatformPermissions(roleOrRoles);
  }

  resolveSitePermissions(roleOrRoles: SiteRole | SiteRole[] | null | undefined): SitePermissions {
    return combineSitePermissions(roleOrRoles);
  }

  hasPlatformPermission(perms: PlatformPermissions, flag: PlatformPermissionFlag): boolean {
    return Boolean(perms?.[flag]);
  }

  hasSitePermission(perms: SitePermissions, flag: SitePermissionFlag): boolean {
    return Boolean(perms?.[flag]);
  }
}
