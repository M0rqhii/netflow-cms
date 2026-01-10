import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentSite decorator - pobiera siteId z requestu
 * AI Note: Używaj w controllerach: @CurrentSite() siteId: string
 */
export const CurrentSite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest() as {
      siteId?: string;
    };
    return request.siteId;
  }
);
