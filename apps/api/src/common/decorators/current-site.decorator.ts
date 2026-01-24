import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentSite decorator - gets siteId from request
 * AI Note: Use in controllers: @CurrentSite() siteId: string
 */
export const CurrentSite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest() as {
      siteId?: string;
    };
    if (!request.siteId) {
      throw new BadRequestException('SiteId not found in request');
    }
    return request.siteId;
  },
);

