import { SetMetadata } from '@nestjs/common';
import { Permission } from '../roles.enum';

/**
 * CollectionPermissions decorator
 * AI Note: Use this decorator to require collection-specific permissions
 * 
 * Example:
 * @CollectionPermissions(Permission.ITEMS_CREATE)
 * 
 * The guard will check both tenant-level and collection-level permissions
 */
export const COLLECTION_PERMISSIONS_KEY = 'collection_permissions';

export const CollectionPermissions = (...permissions: Permission[]) =>
  SetMetadata(COLLECTION_PERMISSIONS_KEY, permissions);




