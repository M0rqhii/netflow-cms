import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

/**
 * SiteGuard - requires siteId to be present on the request
 */
@Injectable()
export class SiteGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as { siteId?: string };
    if (!req.siteId || typeof req.siteId !== 'string') {
      throw new BadRequestException('Missing site ID');
    }
    return true;
  }
}
