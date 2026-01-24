import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../organization/organization.service';
import { SiteService } from '../site/site.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

/**
 * OrgSiteContextMiddleware - automatycznie ustawia kontekst organizacji/strony w requestach
 * AI Note: Middleware ustawia app.current_org_id i app.current_site_id w PostgreSQL session dla RLS
 * 
 * Features:
 * - Ekstrakcja orgId/siteId z header/subdomain/query
 * - Walidacja czy organizacja/strona istnieje
 * - Sprawdzenie czy użytkownik ma dostęp (jeśli zalogowany)
 * - Automatyczne ustawienie app.current_org_id i app.current_site_id w database session
 */
@Injectable()
export class OrgSiteContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OrgSiteContextMiddleware.name);

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly siteService: SiteService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract org ID from various sources
    const orgId =
      req.headers['x-org-id'] ||
      (req.query.orgId as string);

    // Extract site ID from various sources
    const siteId =
      req.headers['x-site-id'] ||
      (req.query.siteId as string);

    // If no orgId provided explicitly, try to derive from authenticated user (JWT)
    let resolvedOrgId = typeof orgId === 'string' ? orgId : undefined;
    const user = (req as { user?: CurrentUserPayload }).user;
    if (!resolvedOrgId && user?.orgId) {
      resolvedOrgId = user.orgId;
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let resolvedSiteId: string | undefined = typeof siteId === 'string' ? siteId : undefined;
    if (resolvedSiteId && !uuidRegex.test(resolvedSiteId)) {
      throw new BadRequestException('Invalid site ID format (must be UUID)');
    }

    // If orgId is missing but siteId is present, derive orgId from site
    let resolvedSite: { orgId: string } | null = null;
    if (!resolvedOrgId && resolvedSiteId) {
      resolvedSite = await this.siteService.findById(resolvedSiteId);
      if (!resolvedSite) {
        throw new BadRequestException(`Site not found: ${resolvedSiteId}`);
      }
      resolvedOrgId = resolvedSite.orgId;
    }

    // Skip middleware if still no org ID provided (for public or global routes)
    if (!resolvedOrgId) {
      return next();
    }

    if (typeof resolvedOrgId !== 'string') {
      throw new BadRequestException('Invalid organization ID format');
    }

    if (!uuidRegex.test(resolvedOrgId)) {
      throw new BadRequestException('Invalid organization ID format (must be UUID)');
    }

    // Validate organization exists
    const organization = await this.organizationService.findById(resolvedOrgId);
    if (!organization) {
      throw new BadRequestException(`Organization not found: ${resolvedOrgId}`);
    }

    // If user is authenticated, validate they have access to this organization
    if (user && user.orgId && user.orgId !== resolvedOrgId) {
      this.logger.warn(
        `User ${user.id} attempted to access organization ${resolvedOrgId} but token org is ${user.orgId}`,
      );
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    // Validate site if provided
    if (resolvedSiteId) {
      const site = resolvedSite || await this.siteService.findById(resolvedSiteId);
      if (!site) {
        throw new BadRequestException(`Site not found: ${resolvedSiteId}`);
      }

      // Validate site belongs to organization
      // Site has no access to org data, only orgId for validation
      if (site.orgId !== resolvedOrgId) {
        throw new BadRequestException('Site does not belong to this organization');
      }
    }

    // Set org/site IDs in request for use in controllers/decorators
    (req as unknown as { orgId: string; siteId?: string }).orgId = resolvedOrgId;
    if (resolvedSiteId) {
      (req as unknown as { siteId: string }).siteId = resolvedSiteId;
    }

    // Set PostgreSQL session variables for Row-Level Security
    // This ensures all queries are automatically filtered by org/site
    // SECURITY: resolvedOrgId and resolvedSiteId are validated as UUID format before use
    try {
      await this.prisma.$executeRawUnsafe(
        `SET app.current_org_id = '${resolvedOrgId}'`,
      );
      if (resolvedSiteId) {
        await this.prisma.$executeRawUnsafe(
          `SET app.current_site_id = '${resolvedSiteId}'`,
        );
      }
      this.logger.debug(`Set org context: ${resolvedOrgId}${resolvedSiteId ? `, site: ${resolvedSiteId}` : ''}`);
    } catch (error) {
      this.logger.error(
        `Failed to set org/site context in database: ${error}`,
      );
      throw new BadRequestException('Failed to set org/site context');
    }

    // Clear org/site context after request completes
    res.on('finish', async () => {
      try {
        await this.prisma.$executeRawUnsafe(`RESET app.current_org_id`);
        if (resolvedSiteId) {
          await this.prisma.$executeRawUnsafe(`RESET app.current_site_id`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to clear org/site context: ${error}`,
        );
      }
    });

    next();
  }
}
