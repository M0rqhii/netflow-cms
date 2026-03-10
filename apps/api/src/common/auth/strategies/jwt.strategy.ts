import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { isPlatformPowerUser } from '../platform-admin.util';
import { coercePublicRbacUserRoleKey, getPublicRbacUserRoleByName } from '@repo/schemas';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  orgId?: string; // Organization ID (optional for global token)
  siteId?: string; // Site ID (optional, only for site-scoped tokens)
  role?: string; // Legacy incoming compatibility claim only
  siteRole?: string; // Legacy incoming compatibility claim only
  platformRole?: string; // Legacy incoming compatibility claim only
  isSuperAdmin?: boolean; // Legacy incoming compatibility claim only
  orgRoleKey?: string;
  orgRoleName?: string;
  siteRoleKey?: string;
  siteRoleName?: string;
  platformRbacRoles?: string[]; // Effective platform RBAC role names
}

type TenantAssignmentSummary = {
  siteId: string | null;
  role: {
    name: string;
    scope: 'ORG' | 'SITE';
  };
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const nodeEnv = configService.get<string>('NODE_ENV');
    const secret =
      configService.get<string>('JWT_SECRET') ||
      (nodeEnv === 'test' ? 'test-jwt-secret' : undefined);
    if (!secret) {
      throw new Error('Missing JWT_SECRET environment variable');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    const orgIdFromToken = payload.orgId;
    const siteIdFromToken = payload.siteId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (orgIdFromToken && !uuidRegex.test(orgIdFromToken)) {
      throw new UnauthorizedException('Invalid orgId in token');
    }
    if (siteIdFromToken && !uuidRegex.test(siteIdFromToken)) {
      throw new UnauthorizedException('Invalid siteId in token');
    }

    const { user, platformRoleNames, tenantAssignments } = await this.prisma.$transaction(async (tx) => {
      if (orgIdFromToken) {
        await tx.$executeRaw(Prisma.sql`SELECT set_config('app.current_org_id', ${orgIdFromToken}, true)`);
      }
      if (siteIdFromToken) {
        await tx.$executeRaw(Prisma.sql`SELECT set_config('app.current_site_id', ${siteIdFromToken}, true)`);
      }
      const dbUser = await tx.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          orgId: true,
        },
      });

      const resolvedOrgId = orgIdFromToken ?? dbUser?.orgId ?? undefined;

      const platformAssignments = await tx.platformUserRole.findMany({
        where: { userId: payload.sub },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      const tenantRoleWhere: Prisma.UserRoleWhereInput | undefined = resolvedOrgId
        ? {
            userId: payload.sub,
            orgId: resolvedOrgId,
            OR: siteIdFromToken
              ? [{ siteId: null }, { siteId: siteIdFromToken }]
              : [{ siteId: null }],
          }
        : undefined;

      const assignments: TenantAssignmentSummary[] = tenantRoleWhere
        ? await tx.userRole.findMany({
            where: tenantRoleWhere,
            select: {
              siteId: true,
              role: {
                select: {
                  name: true,
                  scope: true,
                },
              },
            },
          }).then((items) =>
            items.map((item) => ({
              siteId: item.siteId,
              role: {
                name: item.role.name,
                scope: item.role.scope as 'ORG' | 'SITE',
              },
            })),
          )
        : [];

      return {
        user: dbUser,
        platformRoleNames: platformAssignments.map((assignment) => assignment.role.name),
        tenantAssignments: assignments,
      };
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Use values from database (most up-to-date) or fall back to token payload
    const resolvedOrgId = orgIdFromToken ?? user.orgId;
    const derivedPlatformRoot = platformRoleNames.includes('Platform Root');
    const orgAssignment = this.resolveOrgAssignment(tenantAssignments);
    const siteAssignment = this.resolveSiteAssignment(tenantAssignments, siteIdFromToken);
    const derivedOrgRoleKey =
      this.resolvePublicRoleKeyFromAssignment(orgAssignment?.role.name, 'ORG') ??
      coercePublicRbacUserRoleKey(payload.orgRoleKey || payload.platformRole || payload.role || '', 'ORG') ??
      undefined;
    const derivedSiteRoleKey =
      this.resolvePublicRoleKeyFromAssignment(siteAssignment?.role.name, 'SITE') ??
      coercePublicRbacUserRoleKey(payload.siteRoleKey || payload.siteRole || payload.role || '', 'SITE') ??
      undefined;
    const derivedOrgRoleName = orgAssignment?.role.name || payload.orgRoleName;
    const derivedSiteRoleName = siteAssignment?.role.name || payload.siteRoleName;
    const isPowerUser = isPlatformPowerUser({
      platformRbacRoles: platformRoleNames,
      isSuperAdmin: derivedPlatformRoot || payload.isSuperAdmin || false,
    });

    return {
      id: user.id,
      email: user.email,
      isSuperAdmin: isPowerUser || derivedPlatformRoot || payload.isSuperAdmin || false,
      orgId: resolvedOrgId || undefined,
      siteId: siteIdFromToken || undefined, // Site ID from token (for site-scoped tokens)
      orgRoleKey: derivedOrgRoleKey,
      orgRoleName: derivedOrgRoleName,
      siteRoleKey: derivedSiteRoleKey,
      siteRoleName: derivedSiteRoleName,
      platformRbacRoles: platformRoleNames,
    };
  }

  private resolveOrgAssignment(assignments: TenantAssignmentSummary[]): TenantAssignmentSummary | undefined {
    const preferred = assignments.find(
      (assignment) =>
        assignment.role.scope === 'ORG' &&
        assignment.siteId === null &&
        this.resolvePublicRoleKeyFromAssignment(assignment.role.name, 'ORG') === 'org_admin',
    );

    return preferred ?? assignments.find((assignment) => assignment.role.scope === 'ORG' && assignment.siteId === null);
  }

  private resolveSiteAssignment(
    assignments: TenantAssignmentSummary[],
    siteId?: string,
  ): TenantAssignmentSummary | undefined {
    if (!siteId) {
      return undefined;
    }

    const siteAssignments = assignments.filter(
      (assignment) => assignment.role.scope === 'SITE' && assignment.siteId === siteId,
    );
    if (siteAssignments.length === 0) {
      return undefined;
    }

    const priority = new Map<string, number>([
      ['site_admin', 100],
      ['editor_in_chief', 80],
      ['editor', 70],
      ['marketing_manager', 60],
      ['publisher', 50],
      ['marketing_editor', 40],
      ['marketing_publisher', 35],
      ['marketing_viewer', 20],
      ['viewer', 10],
    ]);

    return [...siteAssignments].sort((left, right) => {
      const leftKey = this.resolvePublicRoleKeyFromAssignment(left.role.name, 'SITE') ?? '';
      const rightKey = this.resolvePublicRoleKeyFromAssignment(right.role.name, 'SITE') ?? '';
      return (priority.get(rightKey) ?? 0) - (priority.get(leftKey) ?? 0);
    })[0];
  }

  private resolvePublicRoleKeyFromAssignment(roleName: string | undefined, scope: 'ORG' | 'SITE') {
    if (!roleName) {
      return null;
    }

    return getPublicRbacUserRoleByName(roleName, scope)?.key ?? null;
  }

}


