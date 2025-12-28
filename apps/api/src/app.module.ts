import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RoleBasedThrottlerGuard } from './common/throttler/role-based-throttler.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TenantModule } from './common/tenant/tenant.module';
import { AuthModule as CommonAuthModule } from './common/auth/auth.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { MonitoringInterceptor } from './common/monitoring/monitoring.interceptor';
import { DebugModule } from './common/debug/debug.module';
import { ProfilingInterceptor } from './common/debug/profiling.interceptor';
import { FeaturesModule } from './common/features/features.module';
import { SaasModule } from './common/saas/saas.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { UsersModule } from './modules/users/users.module';
import { UserTenantsModule } from './modules/user-tenants/user-tenants.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContentTypesModule } from './modules/content-types/content-types.module';
import { ContentEntriesModule } from './modules/content-entries/content-entries.module';
import { ContentWorkflowModule } from './modules/content-workflow/content-workflow.module';
import { MediaModule } from './modules/media/media.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
// GraphQL modules disabled - requires @nestjs/graphql package
// import { GraphQLModule } from './modules/graphql/graphql.module';
// import { GraphQLResolversModule } from './modules/graphql/graphql.resolvers.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { SearchModule } from './modules/search/search.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CollectionRolesModule } from './modules/collection-roles/collection-roles.module';
import { ContentVersioningModule } from './modules/content-versioning/content-versioning.module';
import { HooksModule } from './modules/hooks/hooks.module';
import { BillingModule } from './modules/billing/billing.module';
import { AccountModule } from './modules/account/account.module';
import { StatsModule } from './modules/stats/stats.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SitePanelModule } from './modules/site-panel/site-panel.module';
import { SiteSeoModule } from './modules/site-seo/site-seo.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SiteEventsModule } from './modules/site-events/site-events.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { OrgDashboardModule } from './modules/org-dashboard/org-dashboard.module';
import { HealthController } from './health.controller';
import { PrismaService } from './common/prisma/prisma.service';
import { ProvidersModule } from './common/providers/providers.module';
import { DevModule } from './dev/dev.module';
// Import feature modules here
// import { ContentModule } from './modules/content/content.module';

const isProductionProfile = (process.env.APP_PROFILE || process.env.NODE_ENV || 'development') === 'production';

// Log environment for debugging
if (!isProductionProfile) {
  console.log('[AppModule] DevModule will be loaded - APP_PROFILE:', process.env.APP_PROFILE, 'NODE_ENV:', process.env.NODE_ENV);
} else {
  console.log('[AppModule] DevModule will NOT be loaded - running in production mode');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule, // Global cache module
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute (default, overridden by RoleBasedThrottlerGuard)
      storage: undefined, // Uses default in-memory storage, can be Redis for distributed systems
    }),
    TenantModule,
    CommonAuthModule,
    AuditModule,
    MonitoringModule,
    DebugModule,
    FeaturesModule,
    SaasModule,
    ProvidersModule,
    AuthModule,
    CollectionsModule,
    UsersModule,
    UserTenantsModule,
    TenantsModule,
    ContentTypesModule,
    ContentEntriesModule,
    ContentWorkflowModule,
    MediaModule,
    WebhooksModule,
    // GraphQLModule, // Disabled - requires @nestjs/graphql package
    // GraphQLResolversModule, // Disabled - requires @nestjs/graphql package
    WorkflowModule,
    SearchModule,
    TasksModule,
    CollectionRolesModule,
    ContentVersioningModule,
    HooksModule,
    BillingModule,
    AccountModule,
    StatsModule,
    ActivityModule,
    SitePanelModule,
    SiteSeoModule,
    FeatureFlagsModule,
    SiteEventsModule,
    SnapshotsModule,
    RbacModule,
    MarketingModule,
    OrgDashboardModule,
    ...(isProductionProfile ? [] : [DevModule]),
    // Add feature modules here
    // ContentModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: RoleBasedThrottlerGuard,
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
    // Enable profiling interceptor (dev only, checks internally)
    {
      provide: APP_INTERCEPTOR,
      useClass: ProfilingInterceptor,
    },
  ],
})
export class AppModule {}

// AI Note:
// - Główny moduł NestJS
// - Dodawaj nowe feature modules tutaj
// - ConfigModule jest globalny - dostępny wszędzie
// - Struktura: apps/api/src/modules/{feature}/{feature}.module.ts





