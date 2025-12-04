import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditEvent } from './audit.service';

/**
 * Audit Interceptor - automatically logs API requests
 * 
 * Logs events based on route patterns:
 * - /auth/login -> GLOBAL_LOGIN
 * - /auth/tenant-token -> TENANT_TOKEN_EXCHANGE
 * - /me/tenants -> HUB_ACCESS
 * - /tenant/* -> TENANT_CMS_ACCESS
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const event = this.getEventFromRoute(request);

    return next.handle().pipe(
      tap(() => {
        // Only log if we have a user (authenticated request)
        const user = request.user;
        if (user && event) {
          this.auditService.log({
            event,
            userId: user.id,
            tenantId: user.tenantId || null,
            metadata: {
              ip: request.ip || request.headers['x-forwarded-for'] || 'unknown',
              userAgent: request.headers['user-agent'],
              method: request.method,
              path: request.path,
              resourceId: request.params?.id || request.params?.tenantId || undefined,
            },
          });
        }
      }),
    );
  }

  private getEventFromRoute(request: any): AuditEvent | null {
    const path = request.path;
    const method = request.method;

    // Authentication events
    if (path.includes('/auth/login') && method === 'POST') {
      return AuditEvent.GLOBAL_LOGIN;
    }
    if (path.includes('/auth/logout') && method === 'POST') {
      return AuditEvent.GLOBAL_LOGOUT;
    }
    if (path.includes('/auth/tenant-token') && method === 'POST') {
      return AuditEvent.TENANT_TOKEN_EXCHANGE;
    }

    // Hub access
    if (path.includes('/me/tenants') && method === 'GET') {
      return AuditEvent.HUB_ACCESS;
    }

    // Tenant operations
    if (path.includes('/tenants')) {
      if (method === 'POST') return AuditEvent.TENANT_CREATE;
      if (method === 'PATCH' || method === 'PUT') return AuditEvent.TENANT_UPDATE;
      if (method === 'DELETE') return AuditEvent.TENANT_DELETE;
    }

    // Tenant CMS access (any route under /tenant/* or tenant-scoped routes)
    if (path.includes('/tenant/') || request.headers['x-tenant-id']) {
      return AuditEvent.TENANT_CMS_ACCESS;
    }

    return null;
  }
}
