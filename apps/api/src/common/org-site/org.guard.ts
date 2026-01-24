import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';

/**
 * OrgGuard - requires orgId to be present on the request
 */
@Injectable()
export class OrgGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest() as { orgId?: string };
    if (!req.orgId || typeof req.orgId !== 'string') {
      throw new BadRequestException('Missing organization ID');
    }
    return true;
  }
}
