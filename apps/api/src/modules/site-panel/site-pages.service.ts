import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PageStatus, EnvironmentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsService } from './site-environments.service';
import { CreatePageDto, PageQueryDto, PublishPageDto, UpdatePageDto } from './dto';
import { SiteEventsService } from '../site-events/site-events.service';

@Injectable()
export class SitePagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: SiteEnvironmentsService,
    private readonly siteEvents: SiteEventsService,
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

  async list(tenantId: string, query: PageQueryDto) {
    const where: Prisma.PageWhereInput = { tenantId };

    if (query.environmentId) {
      const env = await this.environments.getById(tenantId, query.environmentId);
      where.environmentId = env.id;
    } else if (query.environmentType) {
      const type = this.mapEnvironmentType(query.environmentType);
      const env = await this.environments.getByTypeOrCreate(
        tenantId,
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

  async getById(tenantId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });
    if (!page) {
      throw new NotFoundException('Page not found for this site');
    }
    return page;
  }

  async create(tenantId: string, dto: CreatePageDto, userId?: string) {
    const environment = await this.environments.getById(tenantId, dto.environmentId);
    const status = dto.status ? this.mapStatus(dto.status) : PageStatus.DRAFT;
    const publishedAt = status === PageStatus.PUBLISHED ? new Date() : null;
    const content = dto.content !== undefined ? (dto.content as Prisma.InputJsonValue) : {};

    try {
      const page = await this.prisma.page.create({
        data: {
          tenantId,
          environmentId: environment.id,
          slug: dto.slug,
          title: dto.title,
          status,
          content,
          publishedAt: publishedAt ?? undefined,
        },
      });

      await this.logEvent(
        tenantId,
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

  async update(tenantId: string, pageId: string, dto: UpdatePageDto, userId?: string) {
    const page = await this.getById(tenantId, pageId);

    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.page.findFirst({
        where: {
          tenantId,
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
      tenantId,
      userId,
      'page_updated',
      `Page "${updated.slug}" updated`,
      { pageId: updated.id, slug: updated.slug, environmentId: updated.environmentId },
    );

    return updated;
  }

  async publish(tenantId: string, pageId: string, dto: PublishPageDto, userId?: string) {
    const sourcePage = await this.getById(tenantId, pageId);
    await this.environments.getById(tenantId, sourcePage.environmentId);

    const targetEnvironment = dto.targetEnvironmentId
      ? await this.environments.getById(tenantId, dto.targetEnvironmentId)
      : await this.environments.getByTypeOrCreate(
          tenantId,
          this.mapEnvironmentType(dto.targetEnvironmentType) || EnvironmentType.PRODUCTION,
        );

    const publishedAt = new Date();
    const content = sourcePage.content ?? {};

    const publishedPage = await this.prisma.page.upsert({
      where: {
        tenant_env_slug: {
          tenantId,
          environmentId: targetEnvironment.id,
          slug: sourcePage.slug,
        },
      },
      create: {
        tenantId,
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
      tenantId,
      userId,
      'page_published',
      `Page "${sourcePage.slug}" published to ${targetEnvironment.type}`,
      { pageId: sourcePage.id, targetEnvironmentId: targetEnvironment.id },
    );

    return {
      draft: updatedSource,
      production: publishedPage,
    };
  }

  async delete(tenantId: string, pageId: string, userId?: string) {
    const page = await this.getById(tenantId, pageId);
    await this.prisma.page.delete({
      where: { id: page.id },
    });

    await this.logEvent(
      tenantId,
      userId,
      'page_deleted',
      `Page "${page.slug}" deleted`,
      { pageId: page.id, slug: page.slug },
    );

    return { success: true };
  }

  async updateContent(tenantId: string, pageId: string, content: Prisma.InputJsonValue, userId?: string) {
    const page = await this.getById(tenantId, pageId);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: { content },
    });

    await this.logEvent(
      tenantId,
      userId,
      'page_updated',
      `Content updated for page "${updated.slug}"`,
      { pageId: updated.id },
    );

    return updated;
  }
}
