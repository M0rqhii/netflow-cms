import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser decorator - extracts user from request
 * AI Note: Use in controllers: @CurrentUser() user: { id: string, orgId: string }
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role?: string; // Legacy role field (backward compatibility with database)
  siteRole?: string; // Site role (viewer, editor, editor-in-chief, marketing, admin, owner)
  orgRole?: string; // Org role (user, editor-in-chief, admin, owner)
  platformRole?: string; // Alias for orgRole (backward compatibility)
  systemRole?: string; // System role (super_admin, system_admin, system_dev, system_support)
  isSuperAdmin?: boolean; // Flag for super admin
  orgId?: string; // Organization ID
  siteId?: string; // Site ID (optional, only for site-scoped tokens)
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


