import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { isPlatformPowerUser } from '../auth/platform-admin.util';
import { type CurrentUserPayload } from '../auth/decorators/current-user.decorator';

const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';
const THROTTLER_SKIP = 'THROTTLER:SKIP';

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Role-based Throttler Guard
 * AI Note: Provides different rate limits based on user role
 * Respects @Throttle decorator limits if set, otherwise uses role-based limits
 */
@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RoleBasedThrottlerGuard.name);

  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for OPTIONS requests (CORS preflight)
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const handler = context.getHandler();
    const classRef = context.getClass();
    if (
      this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, [handler, classRef]) ||
      this.options.skipIf?.(context)
    ) {
      return true;
    }

    const profile = process.env.APP_PROFILE || process.env.NODE_ENV || 'development';
    const isDevelopment = profile !== 'production';
    const routeOrClassLimit = this.reflector.getAllAndOverride<number>(THROTTLER_LIMIT, [
      handler,
      classRef,
    ]);
    const routeOrClassTtl = this.reflector.getAllAndOverride<number>(THROTTLER_TTL, [
      handler,
      classRef,
    ]);

    const limit = routeOrClassLimit
      ? isDevelopment
        ? 999999
        : routeOrClassLimit
      : this.getLimit(context);

    if (isDevelopment && routeOrClassLimit && process.env.DEBUG_THROTTLER === 'true') {
      this.logger.debug(`Using decorator limit: ${limit} (dev mode)`);
    }

    const ttl = routeOrClassTtl ?? this.options.ttl ?? 60000;
    return this.handleRequest(context, limit, ttl);
  }

  protected getTracker(req: Record<string, any>): string {
    // Use user ID + role for tracking to allow different limits per role
    const user = req.user;
    if (user?.id) {
      const roleMarker =
        user.orgRoleKey ||
        user.siteRoleKey ||
        (Array.isArray(user.platformRbacRoles) && user.platformRbacRoles.length > 0
          ? user.platformRbacRoles.join(',')
          : 'authenticated');
      return `${user.id}:${roleMarker}`;
    }
    return req.ip || 'unknown';
  }

  protected getLimit(context: ExecutionContext): number {
    // Check environment consistently with AppModule and HttpExceptionFilter
    // Default to development if neither APP_PROFILE nor NODE_ENV is set
    const profile = process.env.APP_PROFILE || process.env.NODE_ENV || 'development';
    const isDevelopment = profile !== 'production';

    // Otherwise, use role-based limits
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as CurrentUserPayload | undefined;

    // Different limits based on role
    // In development, set to very high limit (effectively unlimited)
    if (isDevelopment) {
      if (process.env.DEBUG_THROTTLER === 'true') {
        this.logger.debug('Development mode - unlimited requests allowed');
      }
      return 999999; // Effectively unlimited in development
    }

    let limit = 50; // Default limit for unauthenticated users
    if (isPlatformPowerUser(user)) {
      limit = 1000; // 1000 requests per minute for super admin
    } else if (
      user?.orgRoleKey === 'org_admin' ||
      normalize(user?.orgRoleName) === 'org owner' ||
      normalize(user?.orgRoleName) === 'org admin'
    ) {
      limit = 500;
    } else if (
      [
        'site_admin',
        'editor_in_chief',
        'editor',
        'publisher',
        'marketing_manager',
        'marketing_editor',
        'marketing_publisher',
      ].includes(String(user?.siteRoleKey || ''))
    ) {
      limit = 200;
    } else if (
      user?.orgRoleKey === 'org_member' ||
      user?.siteRoleKey === 'viewer' ||
      user?.siteRoleKey === 'marketing_viewer'
    ) {
      limit = 100;
    }

    return limit;
  }
}
