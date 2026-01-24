import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SiteService } from '../../common/site/site.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSiteDtoSchema, CreateSiteDto } from './dto/create-site.dto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * SitesController - RESTful API for Sites
 * AI Note: All endpoints require authentication and organization context
 */
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('sites')
export class SitesController {
  private readonly logger = new Logger(SitesController.name);

  constructor(
    private readonly siteService: SiteService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /sites
   * Create a new site for the current organization
   */
  @Post()
  @Permissions(Permission.SITES_WRITE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateSiteDtoSchema)) dto: CreateSiteDto,
  ) {
    const site = await this.siteService.create(orgId, {
      name: dto.name,
      slug: dto.slug,
      settings: dto.settings,
    });

    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      settings: site.settings,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
    };
  }

  /**
   * GET /sites
   * List all sites for the current organization
   * Returns format compatible with SiteInfo[] for frontend
   */
  @Get()
  @Throttle(1000, 60) // 1000 requests per minute - high limit for site list operations
  @Permissions(Permission.SITES_READ)
  async list(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const sites = await this.siteService.findByOrgId(orgId);
    
    const mapRole = (value: string) => {
      const normalized = value.toLowerCase();
      if (normalized == 'org_admin') return 'admin';
      if (normalized == 'super_admin') return 'owner';
      return normalized;
    };

    // Get user's role in organization
    let userRole = 'viewer'; // default
    try {
      const membership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId: user.id, orgId } },
        select: { role: true },
      });
      if (membership) {
        userRole = mapRole(membership.role);
      } else {
        // Fallback: check if user's orgId matches
        const userRecord = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { orgId: true, role: true },
        });
        if (userRecord?.orgId === orgId) {
          userRole = mapRole(userRecord.role || 'viewer');
        }
      }
    } catch (error) {
      // If UserOrg doesn't exist, use user's role
      userRole = mapRole(user.role || 'viewer');
    }
    
    // Get organization plan for sites
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });
    const orgPlan = organization?.plan || 'free';
    
    // Format response as SiteInfo[] for frontend compatibility
    // Ensure all sites have the correct SiteInfo structure
    const formattedSites = sites.map((site) => {
      if (!site || !site.id || !site.name || !site.slug) {
        // Skip invalid sites
        this.logger.warn(`Skipping invalid site: ${JSON.stringify(site)}`);
        return null;
      }
      return {
        siteId: site.id,
        role: userRole,
        site: {
          id: site.id,
          name: site.name,
          slug: site.slug,
          plan: orgPlan, // Sites inherit plan from organization
        },
      };
    }).filter((site): site is NonNullable<typeof site> => site !== null);
    
    return formattedSites;
  }

  /**
   * GET /sites/:siteId
   * Get a specific site
   */
  @Get(':siteId')
  @Permissions(Permission.SITES_READ)
  async get(@CurrentOrg() orgId: string, @Param('siteId') siteId: string) {
    const site = await this.siteService.findById(siteId);
    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }
    if (site.orgId !== orgId) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }
    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      settings: site.settings,
      createdAt: site.createdAt.toISOString(),
      updatedAt: site.updatedAt.toISOString(),
    };
  }

  /**
   * PATCH /sites/:siteId
   * Update a site
   */
  @Patch(':siteId')
  @Permissions(Permission.SITES_WRITE)
  async update(
    @CurrentOrg() orgId: string,
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(
      z.object({
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )) dto: { name?: string; slug?: string; settings?: Record<string, unknown> },
  ) {
    // Verify site exists and belongs to organization
    const site = await this.siteService.findById(siteId);
    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }
    if (site.orgId !== orgId) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    // If slug is being updated, check for conflicts
    if (dto.slug && dto.slug !== site.slug) {
      const existing = await this.siteService.findBySlug(orgId, dto.slug);
      if (existing && existing.id !== siteId) {
        throw new ConflictException(`Site with slug "${dto.slug}" already exists in this organization`);
      }
    }

    const updated = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.settings !== undefined && { settings: dto.settings as Prisma.InputJsonValue }),
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

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      settings: updated.settings,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * DELETE /sites/:siteId
   * Delete a site
   */
  @Delete(':siteId')
  @Permissions(Permission.SITES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentOrg() orgId: string, @Param('siteId') siteId: string) {
    // Verify site exists and belongs to organization
    const site = await this.siteService.findById(siteId);
    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }
    if (site.orgId !== orgId) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    await this.prisma.site.delete({
      where: { id: siteId },
    });
  }
}
