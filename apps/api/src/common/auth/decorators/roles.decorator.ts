import { SetMetadata } from '@nestjs/common';
import { Role } from '../roles.enum';

/**
 * Roles decorator - specifies which roles can access an endpoint
 * Usage: @Roles(Role.ORG_ADMIN, Role.EDITOR)
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);


