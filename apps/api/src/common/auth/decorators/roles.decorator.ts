import { SetMetadata } from '@nestjs/common';
import { SiteRole } from '../roles.enum';

/**
 * Roles decorator - specifies which site roles can access an endpoint
 * Usage: @Roles(SiteRole.ADMIN, SiteRole.EDITOR)
 * AI Note: Use for site-level endpoints (content, pages, media within a site)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: SiteRole[]) => SetMetadata(ROLES_KEY, roles);


