import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser decorator - extracts user from request
 * AI Note: Use in controllers: @CurrentUser() user: { id: string, role: string, tenantId: string }
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string; // tenant role (admin, editor, viewer)
  tenantId: string;
  platformRole?: string; // platform role (platform_admin, org_owner, user)
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


