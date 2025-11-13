import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/**
 * TenantContextMiddleware - automatycznie ustawia kontekst tenantów w requestach
 * AI Note: Middleware ustawia app.current_tenant_id w PostgreSQL session dla RLS
 * 
 * Features:
 * - Ekstrakcja tenant_id z header/subdomain/query
 * - Walidacja czy tenant istnieje
 * - Sprawdzenie czy użytkownik ma dostęp do tenant (jeśli zalogowany)
 * - Automatyczne ustawienie app.current_tenant_id w database session
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from various sources
    const tenantId =
      req.headers['x-tenant-id'] ||
      (req.query.tenantId as string) ||
      this.extractFromSubdomain(req);

    // If no tenantId provided explicitly, try to derive from authenticated user (JWT)
    let resolvedTenantId = typeof tenantId === 'string' ? tenantId : undefined;
    const user = (req as { user?: CurrentUserPayload }).user;
    if (!resolvedTenantId && user?.tenantId) {
      resolvedTenantId = user.tenantId;
    }

    // Skip middleware if still no tenant ID provided (for public or global routes)
    if (!resolvedTenantId) {
      return next();
    }

    if (typeof resolvedTenantId !== 'string') {
      throw new BadRequestException('Invalid tenant ID format');
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resolvedTenantId)) {
      throw new BadRequestException('Invalid tenant ID format (must be UUID)');
    }

    // Validate tenant exists
    const tenant = await this.tenantService.findById(resolvedTenantId);
    if (!tenant) {
      throw new BadRequestException(`Tenant not found: ${resolvedTenantId}`);
    }

    // If user is authenticated, validate they have access to this tenant
    if (user && user.tenantId && user.tenantId !== resolvedTenantId) {
      this.logger.warn(
        `User ${user.id} attempted to access tenant ${resolvedTenantId} but token tenant is ${user.tenantId}`,
      );
      throw new ForbiddenException(
        'You do not have access to this tenant',
      );
    }

    // Set tenant ID in request for use in controllers/decorators
    (req as unknown as { tenantId: string }).tenantId = resolvedTenantId;

    // Set PostgreSQL session variable for Row-Level Security
    // This ensures all queries are automatically filtered by tenant
    try {
      await this.prisma.$executeRaw`
        SET app.current_tenant_id = ${resolvedTenantId}
      `;
      this.logger.debug(`Set tenant context: ${resolvedTenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to set tenant context in database: ${error}`,
      );
      throw new BadRequestException('Failed to set tenant context');
    }

    // Clear tenant context after request completes
    res.on('finish', async () => {
      try {
        await this.prisma.$executeRaw`SET app.current_tenant_id = NULL`;
      } catch (error) {
        this.logger.error(
          `Failed to clear tenant context: ${error}`,
        );
      }
    });

    next();
  }

  /**
   * Extract tenant ID from subdomain
   * Example: acme-corp.example.com -> acme-corp
   * Then looks up tenant by slug
   */
  private extractFromSubdomain(req: Request): string | null {
    const host = req.headers.host;
    if (!host) {
      return null;
    }

    // Extract subdomain (first part before first dot)
    const parts = host.split('.');
    if (parts.length < 2) {
      return null;
    }

    const subdomain = parts[0];
    
    // Skip common subdomains that aren't tenant identifiers
    const skipSubdomains = ['www', 'api', 'admin', 'app'];
    if (skipSubdomains.includes(subdomain.toLowerCase())) {
      return null;
    }

    // Note: This would require async lookup, so we return the subdomain
    // and let the main handler look it up by slug
    // For now, we'll just return null and require explicit tenant ID
    // This can be enhanced later to support subdomain-based tenant resolution
    return null;
  }
}
