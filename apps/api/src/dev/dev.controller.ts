import { Controller, Get, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { AuthGuard } from '../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { DebugService } from '../common/debug/debug.service';

@Controller('dev')
@UseGuards(AuthGuard)
export class DevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debugService: DebugService,
  ) {}

  private async assertPrivileged(user: CurrentUserPayload | null) {
    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fast path: check token claims
    if (
      user.isSuperAdmin === true ||
      user.systemRole === 'super_admin' ||
      user.role === 'super_admin' ||
      user.platformRole === 'platform_admin'
    ) {
      return;
    }

    // Fallback: verify against database (handles old tokens)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, platformRole: true, systemRole: true, isSuperAdmin: true },
    });

    if (
      dbUser?.isSuperAdmin === true ||
      dbUser?.systemRole === 'super_admin' ||
      dbUser?.role === 'super_admin' ||
      dbUser?.platformRole === 'platform_admin'
    ) {
      return;
    }

    throw new ForbiddenException('Dev panel requires super_admin or platform_admin role');
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
