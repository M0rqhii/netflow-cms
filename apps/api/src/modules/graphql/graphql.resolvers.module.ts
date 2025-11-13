import { Module } from '@nestjs/common';
import { TenantResolver } from './resolvers/tenant.resolver';
import { ContentResolver } from './resolvers/content.resolver';
import { TenantsModule } from '../tenants/tenants.module';
import { ContentEntriesModule } from '../content-entries/content-entries.module';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';

/**
 * GraphQL Resolvers Module
 * AI Note: Provides GraphQL resolvers for all entities
 */
@Module({
  imports: [TenantsModule, ContentEntriesModule, AuthModule, TenantModule],
  providers: [TenantResolver, ContentResolver],
})
export class GraphQLResolversModule {}

