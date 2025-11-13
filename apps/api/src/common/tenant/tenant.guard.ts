import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/**
 * TenantGuard - wymusza obecność tenantId w requestach
 * AI Note: Zawsze używaj tego guarda dla endpointów wymagających tenantId
 * 
 * Strategy:
 * - Preferuje tenantId z JWT (jeśli użytkownik jest zalogowany)
 * - Fallback: X-Tenant-ID header lub query parameter
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    
    // Prefer tenantId from JWT (if user is authenticated)
    const user = (req as { user?: CurrentUserPayload }).user;
    let tenantId: string | undefined = user?.tenantId;
    
    // Fallback: X-Tenant-ID header or query parameter
    if (!tenantId) {
      tenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req.query.tenantId as string);
    }

    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('Missing tenant ID. Provide X-Tenant-Id header or use tenant-scoped token.');
    }

    // Validate UUID format to align with DB expectations and RLS context
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('Invalid tenant ID (must be UUID)');
    }

    (req as unknown as { tenantId: string }).tenantId = tenantId;
    return true;
  }
}

