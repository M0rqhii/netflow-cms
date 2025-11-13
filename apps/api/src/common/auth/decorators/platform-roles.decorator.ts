import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../roles.enum';

/**
 * PlatformRoles decorator - specifies which platform roles can access an endpoint
 * Usage: @PlatformRoles(PlatformRole.PLATFORM_ADMIN, PlatformRole.ORG_OWNER)
 * AI Note: Use for platform-level endpoints (create tenants, manage users across tenants)
 */
export const PLATFORM_ROLES_KEY = 'platformRoles';
export const PlatformRoles = (...platformRoles: PlatformRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, platformRoles);

