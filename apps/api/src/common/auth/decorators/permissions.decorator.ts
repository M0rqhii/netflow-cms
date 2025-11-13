import { SetMetadata } from '@nestjs/common';
import { Permission } from '../roles.enum';

/**
 * Permissions decorator - specifies which permissions are required
 * Usage: @Permissions(Permission.USERS_READ, Permission.USERS_WRITE)
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);


