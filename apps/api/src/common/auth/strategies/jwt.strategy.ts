import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  orgId?: string; // Organization ID (optional for global token)
  siteId?: string; // Site ID (optional, only for site-scoped tokens)
  role: string; // Backward compatibility: legacy role (super_admin, org_admin, editor, viewer)
  siteRole?: string; // Site role (viewer, editor, editor-in-chief, marketing, admin, owner)
  platformRole?: string; // Platform role (user, editor-in-chief, admin, owner)
  systemRole?: string; // System role (super_admin, system_admin, system_dev, system_support)
  isSuperAdmin?: boolean; // Flaga dla super admin
}

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

    const user = await this.prisma.$transaction(async (tx) => {
      if (orgIdFromToken) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgIdFromToken}'`);
      }
      if (siteIdFromToken) {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${siteIdFromToken}'`);
      }
      return tx.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true, // Backward compatibility
          siteRole: true,
          platformRole: true,
          systemRole: true,
          isSuperAdmin: true,
          orgId: true,
        },
      });
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Use values from database (most up-to-date) or fall back to token payload
    const resolvedOrgId = orgIdFromToken ?? user.orgId;
    return {
      id: user.id,
      email: user.email,
      role: payload.role || user.role, // Backward compatibility
      siteRole: user.siteRole || payload.siteRole || undefined,
      platformRole: user.platformRole || payload.platformRole || undefined,
      systemRole: user.systemRole || payload.systemRole || undefined,
      isSuperAdmin: user.isSuperAdmin || payload.isSuperAdmin || false,
      orgId: resolvedOrgId || undefined,
      siteId: siteIdFromToken || undefined, // Site ID from token (for site-scoped tokens)
    };
  }
}


