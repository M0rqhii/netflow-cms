import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentSite decorator - gets siteId from request
 * AI Note: Use in controllers: @CurrentSite() siteId: string
 */
export const CurrentSite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest() as {
      siteId?: string;
      params?: { siteId?: string };
      headers?: Record<string, string | string[] | undefined>;
      query?: { siteId?: string };
    };
    if (!request.siteId) {
      const headerSiteId = request.headers?.['x-site-id'];
      const resolvedSiteId =
        (typeof headerSiteId === 'string' ? headerSiteId : undefined) ||
        request.params?.siteId ||
        request.query?.siteId;
      if (resolvedSiteId) {
        request.siteId = resolvedSiteId;
      }
    }
    if (!request.siteId) {
      throw new BadRequestException('SiteId not found in request');
    }
    return request.siteId;
  },
);

