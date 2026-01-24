import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * SiteService - serwis do zarządzania stronami
 * AI Note: 
 * - Site NIE MA dostępu do danych Organization (hierarchia: org > site)
 * - Site zarządza tylko swoimi danymi: content, media, pages, SEO, itp.
 * - Organization zarządza: billing, hosting, domeny, wiele Site'ów
 */
@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find site by ID
   * Returns only site data, NO organization data (site has no access to org)
   */
  async findById(id: string) {
    return this.prisma.site.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true, // Only orgId for validation, not full org data
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find site by slug within organization
   * Returns only site data, NO organization data
   */
  async findBySlug(orgId: string, slug: string) {
    return this.prisma.site.findUnique({
      where: {
        orgId_slug: {
          orgId,
          slug,
        },
      },
      select: {
        id: true,
        orgId: true,
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find all sites for organization
   * Used by Organization level (not Site level)
   * Returns only site data, NO organization data
   */
  async findByOrgId(orgId: string) {
    return this.prisma.site.findMany({
      where: { orgId },
      select: {
        id: true,
        orgId: true,
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateSiteExists(siteId: string): Promise<boolean> {
    const site = await this.findById(siteId);
    return !!site;
  }

  /**
   * Validate site belongs to organization
   * Used for authorization checks
   */
  async validateSiteBelongsToOrg(siteId: string, orgId: string): Promise<boolean> {
    const site = await this.findById(siteId);
    return site?.orgId === orgId;
  }

  /**
   * Create a new site for an organization
   * Used by Organization level (not Site level)
   */
  async create(orgId: string, data: { name: string; slug: string; settings?: Record<string, unknown> }) {
    // Check if site with same slug already exists in this organization
    const existing = await this.findBySlug(orgId, data.slug);
    if (existing) {
      throw new ConflictException(`Site with slug "${data.slug}" already exists in this organization`);
    }

    return this.prisma.site.create({
      data: {
        orgId,
        name: data.name,
        slug: data.slug,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        orgId: true,
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
