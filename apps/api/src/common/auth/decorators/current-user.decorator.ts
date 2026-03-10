import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicRbacUserRoleKey } from '@repo/schemas';

/**
 * CurrentUser decorator - extracts user from request
 * AI Note: Use in controllers: @CurrentUser() user: { id: string, orgId: string }
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  orgId?: string; // Organization ID
  siteId?: string; // Site ID (optional, only for site-scoped tokens)
  orgRoleKey?: PublicRbacUserRoleKey;
  orgRoleName?: string;
  siteRoleKey?: PublicRbacUserRoleKey;
  siteRoleName?: string;
  platformRbacRoles?: string[]; // New RBAC platform role names (Platform Admin, Platform Developer, etc.)
  isSuperAdmin?: boolean; // Derived platform-root flag for compatibility with some UI/runtime checks
}

export const CurrentUser = createParamDecorator(
  (_data: any, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest() as {
      user?: CurrentUserPayload;
    };
    if (!request.user) {
      throw new Error('User not found in request. Ensure AuthGuard is applied.');
    }
    return request.user;
  }
);
