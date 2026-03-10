import { Controller, Get, UseGuards, ForbiddenException, NotFoundException, Query, Param } from '@nestjs/common';
import { AuthGuard } from '../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { DebugService } from '../common/debug/debug.service';
import { MonitoringService } from '../common/monitoring/monitoring.service';
import { canAccessPlatformDevTools } from '../common/auth/platform-admin.util';
import { RbacService } from '../modules/rbac/rbac.service';

@Controller('dev')
@UseGuards(AuthGuard)
export class DevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debugService: DebugService,
    private readonly monitoringService: MonitoringService,
    private readonly rbacService: RbacService,
  ) {}

  private async assertPrivileged(user: CurrentUserPayload | null) {
    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    if (canAccessPlatformDevTools(user)) {
      return;
    }

    const platformCapabilities = await this.rbacService.getEffectivePlatformCapabilities(user.id);
    const hasDevToolsAccess = platformCapabilities.some(
      (capability: { key: string; allowed: boolean }) =>
        capability.key === 'platform.dev.tools.access' && capability.allowed,
    );
    if (hasDevToolsAccess) {
      return;
    }

    throw new ForbiddenException('Dev panel requires Platform Developer, Platform Admin, or Platform Root access');
  }

  @Get('summary')
  async summary(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);

    const [sites, users, emails, subscriptions] = await Promise.all([
      this.prisma.site.count(),
      this.prisma.user.count(),
      this.safeCountEmails(),
      this.safeCountSubscriptions(),
    ]);

    return {
      profile: process.env.APP_PROFILE || process.env.NODE_ENV || 'development',
      sites,
      users,
      emails,
      subscriptions,
    };
  }

  @Get('sites')
  async sites(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    return this.prisma.site.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        orgId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('emails')
  async emails(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    try {
      return await this.prisma.devEmailLog.findMany({
        select: {
          id: true,
          to: true,
          subject: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      // Table might not exist in some environments
      return [];
    }
  }

  @Get('payments')
  async payments(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    try {
      return await this.prisma.subscription.findMany({
        select: {
          id: true,
          orgId: true,
            status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      // Subscriptions table might not be present in early dev setups
      return [];
    }
  }

  @Get('logs')
  async logs(@CurrentUser() user: CurrentUserPayload, @Query('limit') limit?: string) {
    await this.assertPrivileged(user);
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.debugService.getLogs(limitNum);
  }

  @Get('runtime')
  async runtime(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);

    const [sites, users, emails, subscriptions, webhooks, featureOverrides] = await Promise.all([
      this.prisma.site.count(),
      this.prisma.user.count(),
      this.safeCountEmails(),
      this.safeCountSubscriptions(),
      this.safeCountWebhooks(),
      this.safeCountFeatureOverrides(),
    ]);

    return {
      profile: process.env.APP_PROFILE || process.env.NODE_ENV || 'development',
      node: process.version,
      apiVersion: 'v1',
      generatedAt: new Date().toISOString(),
      totals: {
        sites,
        users,
        emails,
        subscriptions,
        webhooks,
        featureOverrides,
      },
    };
  }

  @Get('webhooks')
  async webhooks(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);

    try {
      const rows = await this.prisma.webhook.findMany({
        select: {
          id: true,
          siteId: true,
          url: true,
          events: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          site: {
            select: {
              name: true,
            },
          },
          deliveries: {
            select: {
              createdAt: true,
              statusCode: true,
              error: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });

      return rows.map((row) => ({
        id: row.id,
        siteId: row.siteId,
        siteName: row.site?.name || row.siteId,
        url: row.url,
        events: row.events || [],
        active: row.active,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        lastDeliveryAt: row.deliveries[0]?.createdAt?.toISOString(),
        lastStatus: row.deliveries[0]?.statusCode ?? undefined,
        lastError: row.deliveries[0]?.error ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  @Get('flags')
  async flags(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);

    try {
      const rows = await this.prisma.siteFeatureOverride.findMany({
        select: {
          id: true,
          siteId: true,
          featureKey: true,
          enabled: true,
          createdAt: true,
          site: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      });

      return rows.map((row) => ({
        id: row.id,
        siteId: row.siteId,
        siteName: row.site?.name || row.siteId,
        key: row.featureKey,
        enabled: row.enabled,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  @Get('performance')
  async performance(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    const metrics = this.monitoringService.getMetrics();
    const queryEntries = Object.entries(metrics.queries || {});
    const slowQueries = queryEntries
      .filter(([, v]) => v.avgTime > 500)
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 20)
      .map(([key, v]) => ({ key, ...v }));
    const topQueries = queryEntries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([key, v]) => ({ key, ...v }));
    const mem = process.memoryUsage();
    return {
      cache: metrics.cache,
      slowQueries,
      topQueries,
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      },
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('audit')
  async audit(@CurrentUser() user: CurrentUserPayload, @Query('limit') limit?: string) {
    await this.assertPrivileged(user);
    const take = Math.min(parseInt(limit || '100', 10) || 100, 500);
    try {
      return await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
      });
    } catch {
      return [];
    }
  }

  @Get('events')
  async events(@CurrentUser() user: CurrentUserPayload, @Query('limit') limit?: string) {
    await this.assertPrivileged(user);
    const take = Math.min(parseInt(limit || '100', 10) || 100, 500);
    try {
      const rows = await this.prisma.siteEvent.findMany({
        select: {
          id: true,
          siteId: true,
          userId: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          site: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
      });
      return rows.map((r) => ({
        id: r.id,
        siteId: r.siteId,
        siteName: r.site?.name || r.siteId,
        userId: r.userId,
        type: r.type,
        message: r.message,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }

  @Get('invites')
  async invites(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    await this.assertPrivileged(user);
    try {
      const where = status ? { status } : {};
      const [rows, counts] = await Promise.all([
        this.prisma.userInvite.findMany({
          where,
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            acceptedAt: true,
            createdAt: true,
            orgId: true,
            siteId: true,
            organization: { select: { name: true } },
            site: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.userInvite.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);
      const statusCounts: Record<string, number> = {};
      for (const c of counts as any[]) {
        statusCounts[c.status] = typeof c._count === 'number' ? c._count : c._count?._all || 0;
      }
      return {
        statusCounts,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        items: rows.map((r) => ({
          id: r.id,
          email: r.email,
          role: r.role,
          status: r.status,
          orgName: r.organization?.name || r.orgId,
          siteName: r.site?.name || r.siteId || null,
          expiresAt: r.expiresAt.toISOString(),
          acceptedAt: r.acceptedAt?.toISOString() || null,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    } catch {
      return { statusCounts: {}, total: 0, items: [] };
    }
  }

  @Get('dashboard')
  async dashboard(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const [
      orgsTotal, sitesTotal, usersTotal,
      orgs7d, orgs30d,
      sites7d, sites30d,
      users7d, users30d,
      planGroups,
      subStatusGroups,
      contentStatusGroups,
      mediaCount, mediaSize,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.site.count(),
      this.prisma.user.count(),
      this.prisma.organization.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.site.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.site.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.organization.groupBy({ by: ['plan'], _count: true }).catch(() => []),
      this.safeGroupBy('subscription', 'status'),
      this.safeGroupBy('collectionItem', 'status'),
      this.prisma.mediaItem.count().catch(() => 0),
      this.prisma.mediaItem.aggregate({ _sum: { size: true } }).catch(() => ({ _sum: { size: null } })),
    ]);

    const plans: Record<string, number> = {};
    for (const g of planGroups as any[]) plans[g.plan] = typeof g._count === 'number' ? g._count : g._count?._all || 0;
    const subscriptions: Record<string, number> = {};
    for (const g of subStatusGroups as any[]) subscriptions[g.status] = typeof g._count === 'number' ? g._count : g._count?._all || 0;
    const content: Record<string, number> = {};
    for (const g of contentStatusGroups as any[]) content[g.status] = typeof g._count === 'number' ? g._count : g._count?._all || 0;

    return {
      totals: { orgs: orgsTotal, sites: sitesTotal, users: usersTotal, media: mediaCount },
      growth: { orgs7d, orgs30d, sites7d, sites30d, users7d, users30d },
      plans,
      subscriptions,
      content,
      storage: {
        totalBytes: (mediaSize as any)?._sum?.size || 0,
        mediaCount,
      },
    };
  }

  @Get('organizations')
  async organizations(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    const orgs = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            sites: true,
            memberships: true,
            invites: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest subscription per org
    let subs: Array<{ orgId: string; status: string; currentPeriodEnd: Date | null }> = [];
    try {
      subs = await this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        distinct: ['orgId'],
        select: {
          orgId: true,
          status: true,
          currentPeriodEnd: true,
        },
      });
    } catch {}

    const subMap = new Map<string, typeof subs[number]>(subs.map((s) => [s.orgId, s]));

    return orgs.map((org) => {
      const sub = subMap.get(org.id);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        createdAt: org.createdAt.toISOString(),
        stats: {
          users: org._count.users,
          sites: org._count.sites,
          members: org._count.memberships,
          pendingInvites: org._count.invites,
        },
        subscription: sub ? {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        } : null,
      };
    });
  }

  @Get('security')
  async security(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const [
      expiredInvites,
      pastDueSubs,
      recentAuditErrors,
      usersWithOldPassTokens,
    ] = await Promise.all([
      this.prisma.userInvite.count({
        where: { status: 'pending', expiresAt: { lt: now } },
      }).catch(() => 0),
      this.prisma.subscription.count({
        where: { status: 'past_due' },
      }).catch(() => 0),
      this.prisma.auditLog.findMany({
        where: {
          action: { in: ['delete', 'revoke'] },
          createdAt: { gte: d30 },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
      this.prisma.passwordActionToken.count({
        where: { usedAt: null, expiresAt: { lt: now } },
      }).catch(() => 0),
    ]);

    // Failed webhooks (all active webhooks where last delivery failed)
    let failingWebhooks: Array<{ id: string; url: string; siteName: string }> = [];
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: { active: true },
        select: {
          id: true,
          url: true,
          site: { select: { name: true } },
          deliveries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { statusCode: true },
          },
        },
      });
      failingWebhooks = webhooks
        .filter((w) => w.deliveries[0] && (w.deliveries[0].statusCode === null || w.deliveries[0].statusCode >= 400))
        .map((w) => ({
          id: w.id,
          url: w.url,
          siteName: w.site?.name || 'Unknown',
        }));
    } catch {}

    return {
      expiredInvites,
      pastDueSubscriptions: pastDueSubs,
      expiredPasswordTokens: usersWithOldPassTokens,
      failingWebhooksCount: failingWebhooks.length,
      failingWebhooks: failingWebhooks.slice(0, 10),
      recentDeletions: recentAuditErrors.map((a) => ({
        id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        actorUserId: a.actorUserId,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  private async safeGroupBy(model: string, field: string): Promise<Array<Record<string, any>>> {
    try {
      return await (this.prisma as any)[model].groupBy({
        by: [field],
        _count: true,
      });
    } catch {
      return [];
    }
  }

  private async safeCountEmails(): Promise<number> {
    try {
      return await this.prisma.devEmailLog.count();
    } catch {
      return 0;
    }
  }

  private async safeCountSubscriptions(): Promise<number> {
    try {
      return await this.prisma.subscription.count();
    } catch {
      return 0;
    }
  }

  private async safeCountWebhooks(): Promise<number> {
    try {
      return await this.prisma.webhook.count();
    } catch {
      return 0;
    }
  }

  private async safeCountFeatureOverrides(): Promise<number> {
    try {
      return await this.prisma.siteFeatureOverride.count();
    } catch {
      return 0;
    }
  }
}
