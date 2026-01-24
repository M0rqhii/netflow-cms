import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/config/env.validation';
import { ThrottlerModule } from '@nestjs/throttler';
import { OrgSiteModule } from './common/org-site/org-site.module';
import { AuthModule as CommonAuthModule } from './common/auth/auth.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';
import { SaasModule } from './common/saas/saas.module';
import { ProvidersModule } from './common/providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { ContentTypesModule } from './modules/content-types/content-types.module';
import { ContentEntriesModule } from './modules/content-entries/content-entries.module';
import { ContentWorkflowModule } from './modules/content-workflow/content-workflow.module';
import { MediaModule } from './modules/media/media.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { CollectionRolesModule } from './modules/collection-roles/collection-roles.module';
import { ContentVersioningModule } from './modules/content-versioning/content-versioning.module';
import { HooksModule } from './modules/hooks/hooks.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { MarketingModule } from './modules/marketing/marketing.module';

/**
 * TestAppModule
 * Minimal AppModule variant for E2E tests to avoid loading optional/slow modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    CacheModule,
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 100,
    }),
    OrgSiteModule,
    CommonAuthModule,
    AuditModule,
    SaasModule,
    ProvidersModule,
    AuthModule,
    UsersModule,
    CollectionsModule,
    ContentTypesModule,
    ContentEntriesModule,
    ContentWorkflowModule,
    MediaModule,
    WorkflowModule,
    CollectionRolesModule,
    ContentVersioningModule,
    HooksModule,
    WebhooksModule,
    RbacModule,
    MarketingModule,
  ],
})
export class TestAppModule {}
