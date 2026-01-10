import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SiteEventsService } from '../site-events/site-events.service';

interface SnapshotPayload {
  pages?: Array<{
    id?: string;
    environmentId: string;
    slug: string;
    title: string;
    status: string;
    content?: Prisma.JsonValue;
    publishedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  seoSettings?: Record<string, any> | null;
  featureOverrides?: Array<{
    id?: string;
    featureKey: string;
    enabled: boolean;
    createdAt?: string;
  }>;
  environments?: Array<{
    id: string;
    type: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

@Injectable()
export class SnapshotsService {
  constructor(private readonly prisma: PrismaService, private readonly events: SiteEventsService) {}

  async list(siteId: string) {
    return this.prisma.siteSnapshot.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        createdAt: true,
      },
    });
  }

  private serializeDate(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value as any);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private serializePages(pages: any[]): SnapshotPayload['pages'] {
    return pages.map((page) => ({
      id: page.id,
      environmentId: page.environmentId,
      slug: page.slug,
      title: page.title,
      status: page.status,
      content: page.content as Prisma.JsonValue,
      publishedAt: this.serializeDate(page.publishedAt),
      createdAt: this.serializeDate(page.createdAt) || undefined,
      updatedAt: this.serializeDate(page.updatedAt) || undefined,
    }));
  }

  private serializeEnvironments(envs: any[]): SnapshotPayload['environments'] {
    return envs.map((env) => ({
      id: env.id,
      type: env.type,
      createdAt: this.serializeDate(env.createdAt) || undefined,
      updatedAt: this.serializeDate(env.updatedAt) || undefined,
    }));
  }

  private serializeSeo(seo: any) {
    if (!seo) return null;
    return {
      ...seo,
      createdAt: this.serializeDate(seo.createdAt) || undefined,
      updatedAt: this.serializeDate(seo.updatedAt) || undefined,
    } as Record<string, any>;
  }

  private serializeOverrides(overrides: any[]) {
    return overrides.map((item) => ({
      id: item.id,
      featureKey: item.featureKey,
      enabled: !!item.enabled,
      createdAt: this.serializeDate(item.createdAt) || undefined,
    }));
  }

  async createSnapshot(siteId: string, userId: string | null, label?: string) {
    const [pages, seoSettings, featureOverrides, environments] = await Promise.all([
      this.prisma.page.findMany({ where: { siteId } }),
      this.prisma.seoSettings.findUnique({ where: { siteId } }),
      this.prisma.siteFeatureOverride.findMany({ where: { siteId } }),
      this.prisma.siteEnvironment.findMany({ where: { siteId } }),
    ]);

    const payload: SnapshotPayload = {
      pages: this.serializePages(pages),
      seoSettings: this.serializeSeo(seoSettings),
      featureOverrides: this.serializeOverrides(featureOverrides),
      environments: this.serializeEnvironments(environments),
    };

    const snapshotLabel = (label || '').trim() || `Snapshot ${new Date().toISOString()}`;

    const snapshot = await this.prisma.siteSnapshot.create({
      data: {
        siteId,
        label: snapshotLabel,
        data: payload as Prisma.InputJsonValue,
      },
      select: { id: true, label: true, createdAt: true },
    });

    await this.events.recordEvent(
      siteId,
      userId,
      'snapshot_created',
      `Snapshot "${snapshot.label}" created`,
      { snapshotId: snapshot.id },
    );

    return snapshot;
  }

  private parseDate(value: any, allowNull = false): Date | null | undefined {
    if (value === null) return allowNull ? null : undefined;
    if (value === undefined) return allowNull ? null : undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return allowNull ? null : undefined;
    return parsed;
  }

  async restoreSnapshot(siteId: string, snapshotId: string, userId: string | null) {
    const snapshot = await this.prisma.siteSnapshot.findFirst({
      where: { id: snapshotId, siteId },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found for this site');
    }

    const payload = (snapshot.data || {}) as SnapshotPayload;

    try {
      await this.prisma.$transaction(async (tx) => {
        const envsFromSnapshot = Array.isArray(payload.environments) ? payload.environments : [];
        const existingEnvs = await tx.siteEnvironment.findMany({ where: { siteId } });
        const envMap = new Map<string, string>();

        if (!existingEnvs.length && !envsFromSnapshot.length) {
          const draft = await tx.siteEnvironment.create({ data: { siteId, type: EnvironmentType.DRAFT } });
          const prod = await tx.siteEnvironment.create({ data: { siteId, type: EnvironmentType.PRODUCTION } });
          existingEnvs.push(draft, prod);
        }

        for (const env of envsFromSnapshot) {
          const type = env.type === 'PRODUCTION' || env.type === 'production' ? EnvironmentType.PRODUCTION : EnvironmentType.DRAFT;
          let target = existingEnvs.find((e) => e.id === env.id) || existingEnvs.find((e) => e.type === type);
          if (!target) {
            target = await tx.siteEnvironment.create({ data: { siteId, type } });
            existingEnvs.push(target);
          }
          envMap.set(env.id, target.id);
        }

        let defaultEnvId = existingEnvs.find((e) => e.type === EnvironmentType.DRAFT)?.id || existingEnvs[0]?.id;
        if (!defaultEnvId) {
          const created = await tx.siteEnvironment.create({ data: { siteId, type: EnvironmentType.DRAFT } });
          existingEnvs.push(created);
          defaultEnvId = created.id;
        }

        await tx.page.deleteMany({ where: { siteId } });
        const pages = Array.isArray(payload.pages) ? payload.pages : [];
        if (pages.length) {
          await tx.page.createMany({
            data: pages.map((page) => ({
              id: page.id || undefined,
              siteId,
              environmentId:
                envMap.get(page.environmentId) ||
                existingEnvs.find((e) => e.id === page.environmentId)?.id ||
                defaultEnvId,
              slug: page.slug,
              title: page.title,
              status: page.status as any,
              content: (page.content as Prisma.InputJsonValue) ?? {},
              publishedAt: this.parseDate(page.publishedAt, true) ?? null,
              createdAt: this.parseDate(page.createdAt) ?? undefined,
              updatedAt: this.parseDate(page.updatedAt) ?? undefined,
            })),
          });
        }

        await tx.seoSettings.deleteMany({ where: { siteId } });
        if (payload.seoSettings) {
          const seo = payload.seoSettings;
          await tx.seoSettings.create({
            data: {
              id: (seo as any).id || undefined,
              siteId,
              title: seo.title ?? null,
              description: seo.description ?? null,
              ogTitle: seo.ogTitle ?? null,
              ogDescription: seo.ogDescription ?? null,
              ogImage: seo.ogImage ?? null,
              twitterCard: seo.twitterCard ?? null,
              createdAt: this.parseDate(seo.createdAt) ?? undefined,
              updatedAt: this.parseDate(seo.updatedAt) ?? undefined,
            },
          });
        }

        await tx.siteFeatureOverride.deleteMany({ where: { siteId } });
        const overrides = Array.isArray(payload.featureOverrides) ? payload.featureOverrides : [];
        if (overrides.length) {
          await tx.siteFeatureOverride.createMany({
            data: overrides.map((item) => ({
              id: item.id || undefined,
              siteId,
              featureKey: item.featureKey,
              enabled: !!item.enabled,
              createdAt: this.parseDate(item.createdAt) ?? undefined,
            })),
          });
        }
      });

      await this.events.recordEvent(
        siteId,
        userId,
        'snapshot_restored',
        `Snapshot "${snapshot.label}" restored`,
        { snapshotId: snapshot.id },
      );

      return { success: true };
    } catch (error) {
      await this.events.recordEvent(
        siteId,
        userId,
        'snapshot_restore_failed',
        `Snapshot restore failed for "${snapshot.label}"`,
        { snapshotId: snapshot.id, error: error instanceof Error ? error.message : String(error) },
      );
      throw error;
    }
  }
}
