import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

/**
 * OrgGuard - requires orgId to be present on the request
 */
@Injectable()
export class OrgGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as {
      orgId?: string;
      originalUrl?: string;
      route?: { path?: string };
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

    if (!req.orgId || typeof req.orgId !== 'string') {
      throw new BadRequestException('Missing organization ID');
    }
    return true;
  }
}
