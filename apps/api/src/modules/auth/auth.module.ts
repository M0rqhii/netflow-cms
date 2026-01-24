import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthModule as CommonAuthModule } from '../../common/auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule } from '@nestjs/config';

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
    CacheModule.registerAsync({
      isGlobal: false,
      useFactory: async () => {
        const disableRedis = process.env.REDIS_DISABLED === '1' || process.env.NODE_ENV === 'test';
        if (disableRedis) {
          return { ttl: 60 };
        }
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = process.env.REDIS_PORT ?? '6379';
        const url = process.env.REDIS_URL ?? `redis://${host}:${port}`;
        const store = await redisStore({ url });
        return {
          store,
          ttl: 60, // default ttl (overridden per set)
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}


