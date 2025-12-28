import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser decorator - extracts user from request
 * AI Note: Use in controllers: @CurrentUser() user: { id: string, role: string, tenantId: string }
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string; // Backward compatibility: tenant role (super_admin, tenant_admin, editor, viewer)
  siteRole?: string; // Site role (viewer, editor, editor-in-chief, marketing, admin, owner)
  platformRole?: string; // Platform role (user, editor-in-chief, admin, owner)
  systemRole?: string; // System role (super_admin, system_admin, system_dev, system_support)
  isSuperAdmin?: boolean; // Flaga dla super admin
  tenantId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest() as {
      user?: CurrentUserPayload;
    };
    if (!request.user) {
      throw new Error('User not found in request. Ensure AuthGuard is applied.');
    }
    return request.user;
  }
);


