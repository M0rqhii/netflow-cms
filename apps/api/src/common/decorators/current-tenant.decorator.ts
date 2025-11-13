import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentTenant decorator - pobiera tenantId z requestu
 * AI Note: Używaj w controllerach: @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest() as {
      tenantId?: string;
    };
    if (!request.tenantId) {
      throw new Error('TenantId not found in request');
    }
    return request.tenantId;
  }
);

