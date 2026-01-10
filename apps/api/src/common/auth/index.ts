/**
 * Auth module exports
 * AI Note: Centralized exports for auth module
 */

// Guards
export { AuthGuard } from './guards/auth.guard';
export { RolesGuard } from './guards/roles.guard';
export { PermissionsGuard } from './guards/permissions.guard';

// Decorators
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { Permissions, PERMISSIONS_KEY } from './decorators/permissions.decorator';
export { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';

// Enums and types
export { Role, Permission, ROLE_PERMISSIONS, hasPermission, hasAnyPermission, hasAllPermissions } from './roles.enum';

// Module
export { AuthModule } from './auth.module';

