import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

/**
 * OrgGuard - requires orgId to be present on the request
 * Falls back to extracting from headers/params/query if not set by middleware
 */
@Injectable()
export class OrgGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as {
      orgId?: string;
      originalUrl?: string;
      route?: { path?: string };
      params?: { orgId?: string };
      headers?: Record<string, string | string[] | undefined>;
      query?: { orgId?: string };
      user?: { orgId?: string };
    };

    const routePath = req.route?.path || '';
    const originalUrl = req.originalUrl || '';
    const isMeRoute =
      routePath === 'me' ||
      originalUrl.includes('/users/me');
    const isPreferencesRoute =
      routePath === 'me/preferences' ||
      originalUrl.includes('/users/me/preferences');

    if (isMeRoute || isPreferencesRoute) {
      return true;
    }

    // Fallback extraction if not set by middleware
    if (!req.orgId) {
      const headerOrgId = req.headers?.['x-org-id'];
      const resolvedOrgId =
        (typeof headerOrgId === 'string' ? headerOrgId : undefined) ||
        req.params?.orgId ||
        req.query?.orgId ||
        req.user?.orgId;
      if (resolvedOrgId) {
        req.orgId = resolvedOrgId;
      }
    }

    if (!req.orgId || typeof req.orgId !== 'string') {
      throw new BadRequestException('Missing organization ID');
    }
    return true;
  }
}
