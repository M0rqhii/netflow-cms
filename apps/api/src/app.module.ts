import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TenantModule } from './common/tenant/tenant.module';
import { AuthModule as CommonAuthModule } from './common/auth/auth.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { MonitoringInterceptor } from './common/monitoring/monitoring.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { UsersModule } from './modules/users/users.module';
import { UserTenantsModule } from './modules/user-tenants/user-tenants.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContentTypesModule } from './modules/content-types/content-types.module';
import { ContentEntriesModule } from './modules/content-entries/content-entries.module';
import { MediaModule } from './modules/media/media.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { GraphQLResolversModule } from './modules/graphql/graphql.resolvers.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { SearchModule } from './modules/search/search.module';
import { HealthController } from './health.controller';
import { PrismaService } from './common/prisma/prisma.service';
// Import feature modules here
// import { ContentModule } from './modules/content/content.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule, // Global cache module
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute (default)
    }),
    TenantModule,
    CommonAuthModule,
    AuditModule,
    MonitoringModule,
    AuthModule,
    CollectionsModule,
    UsersModule,
    UserTenantsModule,
    TenantsModule,
    ContentTypesModule,
    ContentEntriesModule,
    MediaModule,
    WebhooksModule,
    GraphQLModule,
    GraphQLResolversModule,
    WorkflowModule,
    SearchModule,
    // Add feature modules here
    // ContentModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Optional: Enable global cache interceptor
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: CacheInterceptor,
    // },
    // Enable global monitoring interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: MonitoringInterceptor,
    },
  ],
})
export class AppModule {}

// AI Note:
// - Główny moduł NestJS
// - Dodawaj nowe feature modules tutaj
// - ConfigModule jest globalny - dostępny wszędzie
// - Struktura: apps/api/src/modules/{feature}/{feature}.module.ts
