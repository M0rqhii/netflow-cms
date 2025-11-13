import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId?: string; // optional for global token (Hub)
  role: string; // tenant role (admin, editor, viewer)
  platformRole?: string; // platform role (platform_admin, org_owner, user)
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
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: payload.role || user.role, // Use role from token (tenant role)
      tenantId: payload.tenantId ?? user.tenantId,
      platformRole: payload.platformRole, // Platform role from token
    };
  }
}


