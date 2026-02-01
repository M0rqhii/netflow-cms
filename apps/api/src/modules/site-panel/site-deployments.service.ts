import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, EnvironmentType, PageStatus } from '@prisma/client';

type PageRecord = Prisma.PageGetPayload<Prisma.PageDefaultArgs>;
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEnvironmentsService } from './site-environments.service';
import { SitePagesService } from './site-pages.service';
import { SiteEventsService } from '../site-events/site-events.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { validatePageBuilderContent } from '../../common/page-builder/publish-validation';
import { PublishDeploymentDto, DeploymentQueryDto } from './dto';
import { GuardrailReasonCode, GuardrailMessages } from '../../common/constants';

@Injectable()
export class SiteDeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: SiteEnvironmentsService,
    private readonly pages: SitePagesService,
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

  async publish(siteId: string, dto: PublishDeploymentDto, userId?: string) {
    const draftEnv = await this.environments.getByTypeOrCreate(siteId, EnvironmentType.DRAFT);
    const productionEnv = await this.environments.getByTypeOrCreate(
      siteId,
      EnvironmentType.PRODUCTION,
    );

    try {
      if (dto.pageId) {
        // Publish single page
        const draftPage = await this.pages.getById(siteId, dto.pageId);

        if (draftPage.environmentId !== draftEnv.id) {
          throw new NotFoundException('Page not found in draft environment');
        }

        const publishedAt = new Date();
        const content = draftPage.content ?? {};

        const enabledModules = await this.featureFlags.getEffectiveFeatures(siteId);
        const validation = validatePageBuilderContent(draftPage.content as any, enabledModules);
        if (!validation.valid) {
          const hasModuleErrors = validation.errors.some((e) => e.type === 'module_disabled');
          throw new BadRequestException({
            message: GuardrailMessages[
              hasModuleErrors ? GuardrailReasonCode.MODULE_DISABLED : GuardrailReasonCode.MISSING_ALT
            ],
            reason: hasModuleErrors ? GuardrailReasonCode.MODULE_DISABLED : GuardrailReasonCode.MISSING_ALT,
            details: validation.errors,
          });
        }

        // Upsert production page
        const productionPage = await this.prisma.page.upsert({
          where: {
            site_env_slug: {
              siteId: siteId,
              environmentId: productionEnv.id,
              slug: draftPage.slug,
            },
          },
          create: {
            siteId: siteId,
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
          siteId,
          'production',
          'publish',
          'success',
          `Published page "${draftPage.title}" (${draftPage.slug})`,
        );

        await this.logEvent(
          siteId,
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
            siteId: siteId,
            environmentId: draftEnv.id,
          },
        });

        // Guardrail: Validate that there are draft pages to publish
        if (draftPages.length === 0) {
          throw new BadRequestException({
            message: GuardrailMessages[GuardrailReasonCode.NO_DRAFT_PAGES],
            reason: GuardrailReasonCode.NO_DRAFT_PAGES,
            details: 'Create or edit pages in draft environment first',
          });
        }

        const publishedAt = new Date();
        const publishedPages: PageRecord[] = [];

        const enabledModules = await this.featureFlags.getEffectiveFeatures(siteId);

        for (const draftPage of draftPages) {
          const validation = validatePageBuilderContent(draftPage.content as any, enabledModules);
          if (!validation.valid) {
            const hasModuleErrors = validation.errors.some((e) => e.type === 'module_disabled');
            throw new BadRequestException({
              message: GuardrailMessages[
                hasModuleErrors ? GuardrailReasonCode.MODULE_DISABLED : GuardrailReasonCode.MISSING_ALT
              ],
              reason: hasModuleErrors ? GuardrailReasonCode.MODULE_DISABLED : GuardrailReasonCode.MISSING_ALT,
              details: validation.errors,
            });
          }
          const content = draftPage.content ?? {};

          const productionPage = await this.prisma.page.upsert({
            where: {
              site_env_slug: {
                siteId: siteId,
                environmentId: productionEnv.id,
                slug: draftPage.slug,
              },
            },
            create: {
              siteId: siteId,
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
          siteId,
          'production',
          'publish',
          'success',
          `Published ${publishedPages.length} page(s) to production`,
        );

        await this.logEvent(
          siteId,
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
        siteId,
        'production',
        'publish',
        'failed',
        errorMessage,
      );

      await this.logEvent(
        siteId,
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

  async list(siteId: string, query: DeploymentQueryDto) {
    const where: Prisma.SiteDeploymentWhereInput = { siteId: siteId };

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

  async getLatest(siteId: string, env?: string) {
    const where: Prisma.SiteDeploymentWhereInput = {
      siteId: siteId,
      env: env || 'production',
    };

    return this.prisma.siteDeployment.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}


