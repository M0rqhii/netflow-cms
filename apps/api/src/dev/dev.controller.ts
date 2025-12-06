import { Controller, Get, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { AuthGuard } from '../common/auth/guards/auth.guard';
import { CurrentUser } from '../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { DebugService } from '../common/debug/debug.service';

type CurrentUserPayload = { id: string; role?: string } | null;

@Controller('dev')
@UseGuards(AuthGuard)
export class DevController {
  private readonly isProd = (process.env.APP_PROFILE || process.env.NODE_ENV || 'development') === 'production';

  constructor(
    private readonly prisma: PrismaService,
    private readonly debugService: DebugService,
  ) {}

  private assertPrivileged(user: CurrentUserPayload) {
    if (this.isProd) {
      throw new ForbiddenException('Dev endpoints are disabled in production');
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'tenant_admin')) {
      throw new ForbiddenException('Insufficient permissions to access dev endpoints');
    }
  }

  @Get('summary')
  async summary(@CurrentUser() user: CurrentUserPayload) {
    this.assertPrivileged(user);

    const [sites, users, emails, subscriptions] = await Promise.all([
      this.prisma.tenant.count(),
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
    this.assertPrivileged(user);
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('emails')
  async emails(@CurrentUser() user: CurrentUserPayload) {
    this.assertPrivileged(user);
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
    this.assertPrivileged(user);
    try {
      return await this.prisma.subscription.findMany({
        select: {
          id: true,
          tenantId: true,
          plan: true,
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
    this.assertPrivileged(user);
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.debugService.getLogs(limitNum);
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
}
