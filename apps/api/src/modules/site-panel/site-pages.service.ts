import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PageStatus, EnvironmentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsService } from './site-environments.service';
import { CreatePageDto, PageQueryDto, PublishPageDto, UpdatePageDto } from './dto';
import { SiteEventsService } from '../site-events/site-events.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { validatePageBuilderContent } from '../../common/page-builder/publish-validation';
import { GuardrailReasonCode, GuardrailMessages } from '../../common/constants';

@Injectable()
export class SitePagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: SiteEnvironmentsService,
    private readonly siteEvents: SiteEventsService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  private async logEvent(
    siteId: string,
    userId: string | undefined,
    type: string,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.siteEvents.recordEvent(siteId, userId ?? null, type, message, metadata);
  }

  private mapStatus(status?: string): PageStatus {
    if (!status) return PageStatus.DRAFT;
    const value = status.toLowerCase();
    if (value === 'published') return PageStatus.PUBLISHED;
    if (value === 'archived') return PageStatus.ARCHIVED;
    return PageStatus.DRAFT;
  }

  private mapEnvironmentType(type?: string): EnvironmentType | undefined {
    if (!type) return undefined;
    return type === 'production' ? EnvironmentType.PRODUCTION : EnvironmentType.DRAFT;
  }

  /**
   * Validate if page content has actual content (sections or blocks)
   */
  private hasContent(content: Prisma.InputJsonValue | null | undefined): boolean {
    if (!content || typeof content !== 'object') {
      return false;
    }

    const contentObj = content as Record<string, any>;
    
    // Check if content has any keys (not empty object)
    if (Object.keys(contentObj).length === 0) {
      return false;
    }

    // Check for sections array
    if (Array.isArray(contentObj.sections) && contentObj.sections.length > 0) {
      return true;
    }

    // Check for blocks array
    if (Array.isArray(contentObj.blocks) && contentObj.blocks.length > 0) {
      return true;
    }

    // Check if there are any other meaningful keys (not just metadata)
    const metadataKeys = ['seo', 'meta', 'settings'];
    const hasNonMetadataKeys = Object.keys(contentObj).some(
      key => !metadataKeys.includes(key.toLowerCase())
    );

    return hasNonMetadataKeys;
  }

  /**
   * Validate slug format
   */
  private isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  }

  /**
   * Check SEO metadata and return warnings
   */
  private checkSeoMetadata(content: Prisma.InputJsonValue | null | undefined): {
    hasMetaTitle: boolean;
    hasMetaDescription: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let hasMetaTitle = false;
    let hasMetaDescription = false;

    if (!content || typeof content !== 'object') {
      return { hasMetaTitle: false, hasMetaDescription: false, warnings: ['Missing SEO metadata'] };
    }

    const contentObj = content as Record<string, any>;
    const seo = contentObj.seo || {};

    if (seo.metaTitle && typeof seo.metaTitle === 'string' && seo.metaTitle.trim().length > 0) {
      hasMetaTitle = true;
    } else {
      warnings.push('Meta title is missing');
    }

    if (seo.metaDescription && typeof seo.metaDescription === 'string' && seo.metaDescription.trim().length > 0) {
      hasMetaDescription = true;
    } else {
      warnings.push('Meta description is missing');
    }

    return { hasMetaTitle, hasMetaDescription, warnings };
  }

  async list(siteId: string, query: PageQueryDto) {
    const where: Prisma.PageWhereInput = { siteId: siteId };

    if (query.environmentId) {
      const env = await this.environments.getById(siteId, query.environmentId);
      where.environmentId = env.id;
    } else if (query.environmentType) {
      const type = this.mapEnvironmentType(query.environmentType);
      const env = await this.environments.getByTypeOrCreate(
        siteId,
        type || EnvironmentType.DRAFT,
      );
      where.environmentId = env.id;
    }

    if (query.status) {
      where.status = this.mapStatus(query.status);
    }

    return this.prisma.page.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(siteId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, siteId: siteId },
    });
    if (!page) {
      throw new NotFoundException('Page not found for this site');
    }
    return page;
  }

  async create(siteId: string, dto: CreatePageDto, userId?: string) {
    // Guardrail: Validate title
    if (!dto.title || typeof dto.title !== 'string' || dto.title.trim().length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.MISSING_TITLE],
        reason: GuardrailReasonCode.MISSING_TITLE,
        details: 'Add a title to create a page',
      });
    }

    // Guardrail: Validate slug
    if (!dto.slug || typeof dto.slug !== 'string' || dto.slug.trim().length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.MISSING_SLUG],
        reason: GuardrailReasonCode.MISSING_SLUG,
        details: 'Add a slug to create a page',
      });
    }

    // Guardrail: Validate slug format
    if (!this.isValidSlug(dto.slug)) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.INVALID_SLUG],
        reason: GuardrailReasonCode.INVALID_SLUG,
        details: 'Slug can only contain lowercase letters, numbers, and hyphens',
      });
    }

    const environment = await this.environments.getById(siteId, dto.environmentId);
    const status = dto.status ? this.mapStatus(dto.status) : PageStatus.DRAFT;
    const publishedAt = status === PageStatus.PUBLISHED ? new Date() : null;
    const content = dto.content !== undefined ? (dto.content as Prisma.InputJsonValue) : {};

    try {
      const page = await this.prisma.page.create({
        data: {
          siteId: siteId,
          environmentId: environment.id,
          slug: dto.slug,
          title: dto.title,
          status,
          content,
          publishedAt: publishedAt ?? undefined,
        },
      });

      await this.logEvent(
        siteId,
        userId,
        'page_created',
        `Page "${page.slug}" created in ${environment.type} environment`,
        { pageId: page.id, slug: page.slug, environmentId: environment.id },
      );

      return page;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Page with this slug already exists in this environment.');
      }
      throw error;
    }
  }

  async update(siteId: string, pageId: string, dto: UpdatePageDto, userId?: string) {
    const page = await this.getById(siteId, pageId);

    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.page.findFirst({
        where: {
          siteId: siteId,
          environmentId: page.environmentId,
          slug: dto.slug,
          NOT: { id: pageId },
        },
      });
      if (existing) {
        throw new ConflictException('Page with this slug already exists in this environment.');
      }
    }

    const updateData: Prisma.PageUpdateInput = {};

    if (dto.slug) updateData.slug = dto.slug;
    if (dto.title) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content as Prisma.InputJsonValue;

    if (dto.status) {
      const nextStatus = this.mapStatus(dto.status);
      updateData.status = nextStatus;
      updateData.publishedAt = nextStatus === PageStatus.PUBLISHED ? new Date() : null;
    }

    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: updateData,
    });

    await this.logEvent(
      siteId,
      userId,
      'page_updated',
      `Page "${updated.slug}" updated`,
      { pageId: updated.id, slug: updated.slug, environmentId: updated.environmentId },
    );

    return updated;
  }

  async publish(siteId: string, pageId: string, dto: PublishPageDto, userId?: string) {
    const sourcePage = await this.getById(siteId, pageId);
    await this.environments.getById(siteId, sourcePage.environmentId);

    // Guardrail: Validate title
    if (!sourcePage.title || typeof sourcePage.title !== 'string' || sourcePage.title.trim().length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.MISSING_TITLE],
        reason: GuardrailReasonCode.MISSING_TITLE,
        details: 'Add a title to your page before publishing',
      });
    }

    // Guardrail: Validate slug
    if (!sourcePage.slug || typeof sourcePage.slug !== 'string' || sourcePage.slug.trim().length === 0) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.MISSING_SLUG],
        reason: GuardrailReasonCode.MISSING_SLUG,
        details: 'Add a slug to your page before publishing',
      });
    }

    // Guardrail: Validate slug format
    if (!this.isValidSlug(sourcePage.slug)) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.INVALID_SLUG],
        reason: GuardrailReasonCode.INVALID_SLUG,
        details: 'Slug can only contain lowercase letters, numbers, and hyphens',
      });
    }

    // Guardrail: Validate content is not empty
    if (!this.hasContent(sourcePage.content)) {
      throw new BadRequestException({
        message: GuardrailMessages[GuardrailReasonCode.EMPTY_CONTENT],
        reason: GuardrailReasonCode.EMPTY_CONTENT,
        details: 'Add at least one section or block before publishing',
      });
    }

    const enabledModules = await this.featureFlags.getEffectiveFeatures(siteId);
    const validation = validatePageBuilderContent(sourcePage.content as any, enabledModules);
    if (!validation.valid) {
      const hasModuleErrors = validation.errors.some((e) => e.type === 'module_disabled');
      const hasAltErrors = validation.errors.some((e) => e.type === 'missing_alt');
      throw new BadRequestException({
        message: hasModuleErrors
          ? GuardrailMessages[GuardrailReasonCode.MODULE_DISABLED]
          : GuardrailMessages[GuardrailReasonCode.MISSING_ALT],
        reason: hasModuleErrors
          ? GuardrailReasonCode.MODULE_DISABLED
          : GuardrailReasonCode.MISSING_ALT,
        details: validation.errors,
      });
    }

    const targetEnvironment = dto.targetEnvironmentId
      ? await this.environments.getById(siteId, dto.targetEnvironmentId)
      : await this.environments.getByTypeOrCreate(
          siteId,
          this.mapEnvironmentType(dto.targetEnvironmentType) || EnvironmentType.PRODUCTION,
        );

    // Check if page is already published with same content (warning, not error)
    const existingProductionPage = await this.prisma.page.findUnique({
      where: {
        site_env_slug: {
          siteId: siteId,
          environmentId: targetEnvironment.id,
          slug: sourcePage.slug,
        },
      },
    });

    let seoWarnings: string[] = [];
    let alreadyPublished = false;

    if (existingProductionPage) {
      // Check if content changed
      const contentChanged = JSON.stringify(sourcePage.content) !== JSON.stringify(existingProductionPage.content);
      const titleChanged = sourcePage.title !== existingProductionPage.title;

      if (!contentChanged && !titleChanged) {
        alreadyPublished = true;
        // This is a warning, not an error - we allow publishing anyway
      }
    }

    // Check SEO metadata (warning, not error)
    const seoCheck = this.checkSeoMetadata(sourcePage.content);
    if (seoCheck.warnings.length > 0) {
      seoWarnings = seoCheck.warnings;
    }

    const publishedAt = new Date();
    const content = sourcePage.content ?? {};

    const publishedPage = await this.prisma.page.upsert({
      where: {
        site_env_slug: {
          siteId: siteId,
          environmentId: targetEnvironment.id,
          slug: sourcePage.slug,
        },
      },
      create: {
        siteId: siteId,
        environmentId: targetEnvironment.id,
        slug: sourcePage.slug,
        title: sourcePage.title,
        status: PageStatus.PUBLISHED,
        content,
        publishedAt,
      },
      update: {
        title: sourcePage.title,
        status: PageStatus.PUBLISHED,
        content,
        publishedAt,
      },
    });

    const updatedSource = await this.prisma.page.update({
      where: { id: sourcePage.id },
      data: {
        status: PageStatus.PUBLISHED,
        publishedAt,
      },
    });

    await this.logEvent(
      siteId,
      userId,
      'page_published',
      `Page "${sourcePage.slug}" published to ${targetEnvironment.type}`,
      { pageId: sourcePage.id, targetEnvironmentId: targetEnvironment.id },
    );

    return {
      draft: updatedSource,
      production: publishedPage,
      warnings: {
        seo: seoWarnings.length > 0 ? {
          reason: GuardrailReasonCode.MISSING_SEO_META,
          message: GuardrailMessages[GuardrailReasonCode.MISSING_SEO_META],
          details: seoWarnings,
        } : undefined,
        alreadyPublished: alreadyPublished ? {
          reason: GuardrailReasonCode.ALREADY_PUBLISHED,
          message: GuardrailMessages[GuardrailReasonCode.ALREADY_PUBLISHED],
          details: 'This page is already live with the same content. No changes detected.',
        } : undefined,
      },
    };
  }

  async delete(siteId: string, pageId: string, userId?: string) {
    const page = await this.getById(siteId, pageId);
    await this.prisma.page.delete({
      where: { id: page.id },
    });

    await this.logEvent(
      siteId,
      userId,
      'page_deleted',
      `Page "${page.slug}" deleted`,
      { pageId: page.id, slug: page.slug },
    );

    return { success: true };
  }

  async updateContent(siteId: string, pageId: string, content: Prisma.InputJsonValue, userId?: string) {
    const page = await this.getById(siteId, pageId);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: { content },
    });

    await this.logEvent(
      siteId,
      userId,
      'page_updated',
      `Content updated for page "${updated.slug}"`,
      { pageId: updated.id },
    );

    return updated;
  }
}
