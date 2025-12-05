import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Role-based Throttler Guard
 * AI Note: Provides different rate limits based on user role
 */
@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Use user ID + role for tracking to allow different limits per role
    const user = req.user;
    if (user?.id) {
      return `${user.id}:${user.role || 'anonymous'}`;
    }
    return req.ip || 'unknown';
  }

  protected getLimit(context: ExecutionContext): number {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Different limits based on role
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

