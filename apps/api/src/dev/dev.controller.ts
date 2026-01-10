import { Controller, Get, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { AuthGuard } from '../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { DebugService } from '../common/debug/debug.service';

@Controller('dev')
@UseGuards(AuthGuard)
export class DevController {
  private readonly isProd = (process.env.APP_PROFILE || process.env.NODE_ENV || 'development') === 'production';

  constructor(
    private readonly prisma: PrismaService,
    private readonly debugService: DebugService,
  ) {}

  private async assertPrivileged(user: CurrentUserPayload | null) {
    if (this.isProd) {
      throw new ForbiddenException('Dev endpoints are disabled in production');
    }
    
    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }
    
    // Check isSuperAdmin flag first (highest priority)
    if (user.isSuperAdmin === true) {
      return; // Super admin always has access
    }
    
    // Check systemRole from token
    if (user.systemRole === 'super_admin') {
      return; // System super admin has access
    }
    
    // Check role from token
    const tokenRole = user.role;
    const hasPrivilegedRoleFromToken = 
      tokenRole === 'super_admin' || 
      tokenRole === 'tenant_admin';
    
    if (hasPrivilegedRoleFromToken) {
      return; // User has privileged role in token
    }
    
    // Check platformRole from token (platform_admin should have access)
    const platformRole = user.platformRole;
    if (platformRole === 'platform_admin') {
      return; // Platform admin has access
    }
    
    // Fallback: Check database if token doesn't have role (for old tokens or super_admin)
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { 
          role: true, 
          platformRole: true, 
          systemRole: true,
          isSuperAdmin: true,
        },
      });
      
      if (dbUser) {
        // Check isSuperAdmin flag in database
        if (dbUser.isSuperAdmin === true) {
          return; // Super admin always has access
        }
        
        // Check systemRole in database
        if (dbUser.systemRole === 'super_admin') {
          return; // System super admin has access
        }
        
        // Check tenant role
        if (dbUser.role === 'super_admin' || dbUser.role === 'tenant_admin') {
          return; // User has privileged role in database
        }
        
        // Check platform role
        if (dbUser.platformRole === 'platform_admin') {
          return; // User has platform admin role in database
        }
      }
    } catch (error) {
      // If database check fails, continue to throw error
    }
    
    // No privileged role found
    throw new ForbiddenException('Insufficient permissions to access dev endpoints. Required role: super_admin, tenant_admin, or platform_admin');
  }

  @Get('summary')
  async summary(@CurrentUser() user: CurrentUserPayload) {
    await this.assertPrivileged(user);

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
    await this.assertPrivileged(user);
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
    await this.assertPrivileged(user);
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
