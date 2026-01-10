import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentOrg decorator - pobiera orgId z requestu
 * AI Note: Używaj w controllerach: @CurrentOrg() orgId: string
 */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest() as {
      orgId?: string;
      tenantId?: string; // Backward compatibility
    };
    if (!request.orgId && !request.tenantId) {
      throw new Error('OrgId not found in request');
    }
    return request.orgId || request.tenantId!;
  }
);
