import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

/**
 * Role-based Throttler Guard
 * AI Note: Provides different rate limits based on user role
 * Respects @Throttle decorator limits if set, otherwise uses role-based limits
 */
@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, any>): string {
    // Use user ID + role for tracking to allow different limits per role
    const user = req.user;
    if (user?.id) {
      return `${user.id}:${user.role || 'anonymous'}`;
    }
    return req.ip || 'unknown';
  }

  protected getLimit(context: ExecutionContext): number {
    // Check environment consistently with AppModule and HttpExceptionFilter
    // Default to development if neither APP_PROFILE nor NODE_ENV is set
    const profile = process.env.APP_PROFILE || process.env.NODE_ENV || 'development';
    const isDevelopment = profile !== 'production';
    
    // First check if @Throttle decorator is set - if so, use that limit
    const handler = context.getHandler();
    const classRef = context.getClass();
    const throttlerMetadata = this.reflector.getAllAndOverride<number[]>('THROTTLER', [handler, classRef]);
    
    if (throttlerMetadata && throttlerMetadata.length >= 1) {
      // @Throttle decorator limit takes precedence
      // In development, set to very high limit (effectively unlimited)
      const limit = isDevelopment ? 999999 : throttlerMetadata[0];
      if (isDevelopment && process.env.DEBUG_THROTTLER === 'true') {
        console.log(`[Throttler] Using decorator limit: ${limit} (dev mode)`);
      }
      return limit;
    }

    // Otherwise, use role-based limits
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Different limits based on role
    // In development, set to very high limit (effectively unlimited)
    if (isDevelopment) {
      if (process.env.DEBUG_THROTTLER === 'true') {
        console.log(`[Throttler] Development mode - unlimited requests allowed`);
      }
      return 999999; // Effectively unlimited in development
    }
    
    if (user?.role === 'super_admin') {
      return 1000; // 1000 requests per minute for super admin
    }
    if (user?.role === 'tenant_admin') {
      return 500; // 500 requests per minute for tenant admin
    }
    if (user?.role === 'editor') {
      return 200; // 200 requests per minute for editor
    }
    if (user?.role === 'viewer') {
      return 100; // 100 requests per minute for viewer
    }

    // Default limit for unauthenticated users
    return 50; // 50 requests per minute
  }
}

