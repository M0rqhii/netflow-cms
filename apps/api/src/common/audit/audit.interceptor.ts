import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditEvent } from './audit.service';

/**
 * Audit Interceptor - automatically logs API requests
 * 
 * Logs events based on route patterns:
 * - /auth/login -> GLOBAL_LOGIN
 * - /auth/org-token -> ORG_TOKEN_EXCHANGE
 * - /me/orgs -> HUB_ACCESS
 * - /site-* -> SITE_CMS_ACCESS
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
            orgId: request.orgId || user.orgId || null,
            siteId: request.siteId || user.siteId || null,
            metadata: {
              ip: request.ip || request.headers['x-forwarded-for'] || 'unknown',
              userAgent: request.headers['user-agent'],
              method: request.method,
              path: request.path,
              resourceId: request.params?.id || request.params?.orgId || request.params?.siteId || undefined,
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
    if (path.includes('/auth/org-token') && method === 'POST') {
      return AuditEvent.ORG_TOKEN_EXCHANGE;
    }
    if (path.includes('/auth/site-token') && method === 'POST') {
      return AuditEvent.SITE_TOKEN_EXCHANGE;
    }

    // Hub access
    if (path.includes('/me/orgs') && method === 'GET') {
      return AuditEvent.HUB_ACCESS;
    }

    // Organization operations
    if (path.includes('/orgs')) {
      if (method === 'POST') return AuditEvent.ORG_CREATE;
      if (method === 'PATCH' || method === 'PUT') return AuditEvent.ORG_UPDATE;
      if (method === 'DELETE') return AuditEvent.ORG_DELETE;
    }

    // Site CMS access (site-scoped routes)
    if (path.includes('/site-') || request.headers['x-site-id'] || request.siteId) {
      return AuditEvent.SITE_CMS_ACCESS;
    }

    return null;
  }
}
