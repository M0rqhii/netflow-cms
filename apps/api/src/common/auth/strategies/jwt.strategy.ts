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
  tenantId?: string; // DEPRECATED: Backward compatibility - use orgId instead
  role: string; // Backward compatibility: tenant role (super_admin, tenant_admin, editor, viewer)
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
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Use values from database (most up-to-date) or fall back to token payload
    const orgId = payload.orgId ?? user.orgId;
    return {
      id: user.id,
      email: user.email,
      role: payload.role || user.role, // Backward compatibility
      siteRole: user.siteRole || payload.siteRole || undefined,
      platformRole: user.platformRole || payload.platformRole || undefined,
      systemRole: user.systemRole || payload.systemRole || undefined,
      isSuperAdmin: user.isSuperAdmin || payload.isSuperAdmin || false,
      orgId: orgId || undefined,
      tenantId: payload.tenantId || orgId, // Backward compatibility - map orgId to tenantId
    };
  }
}


