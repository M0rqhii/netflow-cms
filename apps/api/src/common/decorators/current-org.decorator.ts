import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/**
 * CurrentOrg decorator - pobiera orgId z requestu lub z user payload
 * AI Note: Używaj w controllerach: @CurrentOrg() orgId: string
 * 
 * Pobiera orgId w kolejności:
 * 1. Z request.orgId (ustawione przez middleware)
 * 2. Z user.orgId (z JWT token)
 */
export const CurrentOrg = createParamDecorator(
  (_data: any, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest() as {
      orgId?: string;
      user?: CurrentUserPayload;
    };
    
    // Try to get from request (set by middleware)
    if (request.orgId) {
      return request.orgId;
    }
    // Fallback to user payload (from JWT token)
    const user = request.user;
    if (user?.orgId) {
      return user.orgId;
    }
    throw new Error('OrgId not found in request or user payload');
  }
);
