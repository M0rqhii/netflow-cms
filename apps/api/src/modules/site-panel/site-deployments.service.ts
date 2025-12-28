import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, EnvironmentType, PageStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsService } from './site-environments.service';
import { SitePagesService } from './site-pages.service';
import { SiteEventsService } from '../site-events/site-events.service';
import { PublishDeploymentDto, DeploymentQueryDto } from './dto';

@Injectable()
export class SiteDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: SiteEnvironmentsService,
    private readonly pages: SitePagesService,
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

  private async createDeployment(
    siteId: string,
    env: string,
    type: string,
    status: 'success' | 'failed',
    message?: string,
  ) {
    return this.prisma.siteDeployment.create({
      data: {
        siteId,
        env,
        type,
        status,
        message: message ?? null,
      },
    });
  }

  async publish(tenantId: string, dto: PublishDeploymentDto, userId?: string) {
    const draftEnv = await this.environments.getByTypeOrCreate(tenantId, EnvironmentType.DRAFT);
    const productionEnv = await this.environments.getByTypeOrCreate(
      tenantId,
      EnvironmentType.PRODUCTION,
    );

    try {
      if (dto.pageId) {
        // Publish single page
        const draftPage = await this.pages.getById(tenantId, dto.pageId);

        if (draftPage.environmentId !== draftEnv.id) {
          throw new NotFoundException('Page not found in draft environment');
        }

        const publishedAt = new Date();
        const content = draftPage.content ?? {};

        // Upsert production page
        const productionPage = await this.prisma.page.upsert({
          where: {
            tenant_env_slug: {
              tenantId,
              environmentId: productionEnv.id,
              slug: draftPage.slug,
            },
          },
          create: {
            tenantId,
            environmentId: productionEnv.id,
            slug: draftPage.slug,
            title: draftPage.title,
            status: PageStatus.PUBLISHED,
            content,
            publishedAt,
          },
          update: {
            title: draftPage.title,
            status: PageStatus.PUBLISHED,
            content,
            publishedAt,
          },
        });

        // Update draft page status
        await this.prisma.page.update({
          where: { id: draftPage.id },
          data: {
            status: PageStatus.PUBLISHED,
            publishedAt,
          },
        });

        const deployment = await this.createDeployment(
          tenantId,
          'production',
          'publish',
          'success',
          `Published page "${draftPage.title}" (${draftPage.slug})`,
        );

        await this.logEvent(
          tenantId,
          userId,
          'deployment_created',
          `Page "${draftPage.title}" published to production`,
          {
            deploymentId: deployment.id,
            pageId: draftPage.id,
            productionPageId: productionPage.id,
          },
        );

        return {
          deployment,
          pagesPublished: 1,
          pages: [productionPage],
        };
      } else {
        // Publish all draft pages
        const draftPages = await this.prisma.page.findMany({
          where: {
            tenantId,
            environmentId: draftEnv.id,
          },
        });

        if (draftPages.length === 0) {
          const deployment = await this.createDeployment(
            tenantId,
            'production',
            'publish',
            'success',
            'No draft pages to publish',
          );

          await this.logEvent(
            tenantId,
            userId,
            'deployment_created',
            'Publish attempted but no draft pages found',
            {
              deploymentId: deployment.id,
            },
          );

          return {
            deployment,
            pagesPublished: 0,
            pages: [],
          };
        }

        const publishedAt = new Date();
        const publishedPages = [];

        for (const draftPage of draftPages) {
          const content = draftPage.content ?? {};

          const productionPage = await this.prisma.page.upsert({
            where: {
              tenant_env_slug: {
                tenantId,
                environmentId: productionEnv.id,
                slug: draftPage.slug,
              },
            },
            create: {
              tenantId,
              environmentId: productionEnv.id,
              slug: draftPage.slug,
              title: draftPage.title,
              status: PageStatus.PUBLISHED,
              content,
              publishedAt,
            },
            update: {
              title: draftPage.title,
              status: PageStatus.PUBLISHED,
              content,
              publishedAt,
            },
          });

          // Update draft page status
          await this.prisma.page.update({
            where: { id: draftPage.id },
            data: {
              status: PageStatus.PUBLISHED,
              publishedAt,
            },
          });

          publishedPages.push(productionPage);
        }

        const deployment = await this.createDeployment(
          tenantId,
          'production',
          'publish',
          'success',
          `Published ${publishedPages.length} page(s) to production`,
        );

        await this.logEvent(
          tenantId,
          userId,
          'deployment_created',
          `Published ${publishedPages.length} page(s) to production`,
          {
            deploymentId: deployment.id,
            pagesCount: publishedPages.length,
          },
        );

        return {
          deployment,
          pagesPublished: publishedPages.length,
          pages: publishedPages,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const deployment = await this.createDeployment(
        tenantId,
        'production',
        'publish',
        'failed',
        errorMessage,
      );

      await this.logEvent(
        tenantId,
        userId,
        'deployment_failed',
        `Publish failed: ${errorMessage}`,
        {
          deploymentId: deployment.id,
          error: errorMessage,
        },
      );

      throw error;
    }
  }

  async list(tenantId: string, query: DeploymentQueryDto) {
    const where: Prisma.SiteDeploymentWhereInput = { siteId: tenantId };

    if (query.env) {
      where.env = query.env;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const limit = query.limit ? Math.min(Math.max(query.limit, 1), 200) : 50;

    return this.prisma.siteDeployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLatest(tenantId: string, env?: string) {
    const where: Prisma.SiteDeploymentWhereInput = {
      siteId: tenantId,
      env: env || 'production',
    };

    return this.prisma.siteDeployment.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

