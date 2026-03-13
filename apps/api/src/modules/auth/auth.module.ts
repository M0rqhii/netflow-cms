import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthModule as CommonAuthModule } from '../../common/auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * AuthModule - moduł autentykacji z endpointami login/register
 * AI Note: Używa AuthModule z common/auth dla guardów i strategii JWT
 * JwtModule jest eksportowany z CommonAuthModule, więc AuthService ma dostęp do JwtService
 * AuditModule jest globalny, więc AuditService jest dostępny wszędzie
 */
@Module({
  imports: [
    CommonAuthModule,
    AuditModule, // Import AuditModule for AuditService (though it's global)
    ConfigModule,
    NotificationsModule,
    RbacModule,
    CacheModule.registerAsync({
      isGlobal: false,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const disableRedis =
          configService.get<string>('REDIS_DISABLED') === '1' ||
          process.env.NODE_ENV === 'test';
        if (disableRedis) {
          return { ttl: 60 };
        }
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<string>('REDIS_PORT') || '6379';
        const url = configService.get<string>('REDIS_URL') || `redis://${host}:${port}`;
        const logger = new Logger('AuthCacheModule');
        try {
          const store = await redisStore({ url });
          return {
            store,
            ttl: 60, // default ttl (overridden per set)
          };
        } catch (error) {
          logger.warn(`Redis unavailable at ${url}, falling back to memory store`, error);
          return { ttl: 60 };
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}


