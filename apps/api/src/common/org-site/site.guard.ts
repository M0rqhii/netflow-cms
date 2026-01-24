import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

/**
 * SiteGuard - requires siteId to be present on the request
 */
@Injectable()
export class SiteGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as {
      siteId?: string;
      params?: { siteId?: string };
      headers?: Record<string, string | string[] | undefined>;
      query?: { siteId?: string };
    };
    if (!req.siteId) {
      const headerSiteId = req.headers?.['x-site-id'];
      const resolvedSiteId =
        (typeof headerSiteId === 'string' ? headerSiteId : undefined) ||
        req.params?.siteId ||
        req.query?.siteId;
      if (resolvedSiteId) {
        req.siteId = resolvedSiteId;
      }
    }
    if (!req.siteId || typeof req.siteId !== 'string') {
      throw new BadRequestException('Missing site ID');
    }
    return true;
  }
}
