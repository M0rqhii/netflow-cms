import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PageStatus, EnvironmentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsService } from './site-environments.service';
import { CreatePageDto, PageQueryDto, PublishPageDto, UpdatePageDto } from './dto';

@Injectable()
export class SitePagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: SiteEnvironmentsService,
  ) {}

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

  async create(tenantId: string, dto: CreatePageDto) {
    const environment = await this.environments.getById(tenantId, dto.environmentId);
    const status = dto.status ? this.mapStatus(dto.status) : PageStatus.DRAFT;
    const publishedAt = status === PageStatus.PUBLISHED ? new Date() : null;
    const content = dto.content !== undefined ? (dto.content as Prisma.InputJsonValue) : {};

    try {
      return await this.prisma.page.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Page with this slug already exists in this environment.');
      }
      throw error;
    }
  }

  async update(tenantId: string, pageId: string, dto: UpdatePageDto) {
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

    return this.prisma.page.update({
      where: { id: page.id },
      data: updateData,
    });
  }

  async publish(tenantId: string, pageId: string, dto: PublishPageDto) {
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

    return {
      draft: updatedSource,
      production: publishedPage,
    };
  }
}
