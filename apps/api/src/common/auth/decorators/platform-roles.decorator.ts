import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '../roles.enum';

/**
 * OrgRoles decorator - specifies which organization roles can access an endpoint
 * Usage: @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
 * AI Note: Use for org-level endpoints (manage organization, manage users within organization)
 */
export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...orgRoles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, orgRoles);

// Backward compatibility alias
export const PLATFORM_ROLES_KEY = ORG_ROLES_KEY;
export const PlatformRoles = OrgRoles;

