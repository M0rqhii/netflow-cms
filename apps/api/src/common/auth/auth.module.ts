import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CapabilityGuard } from './guards/capability.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RbacModule } from '../../modules/rbac/rbac.module';

/**
 * AuthModule - provides authentication and authorization guards
 * AI Note: Import this module in feature modules that need auth/authorization
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RbacModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const secret =
          configService.get<string>('JWT_SECRET') ||
          (nodeEnv === 'test' ? 'test-jwt-secret' : undefined);
        if (!secret) {
          throw new Error('Missing JWT_SECRET environment variable');
        }
        const expires = configService.get<number>('JWT_EXPIRES_IN');
        return {
          secret,
          signOptions: {
            // default: 7 days in seconds
            expiresIn: typeof expires === 'number' ? expires : 60 * 60 * 24 * 7,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthGuard, RolesGuard, PlatformRolesGuard, PermissionsGuard, CapabilityGuard, CsrfGuard, JwtStrategy, PrismaService],
  exports: [AuthGuard, RolesGuard, PlatformRolesGuard, PermissionsGuard, CapabilityGuard, CsrfGuard, JwtModule],
})
export class AuthModule {}
