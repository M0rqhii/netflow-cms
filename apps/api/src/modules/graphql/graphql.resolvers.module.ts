import { Module } from '@nestjs/common';
import { ContentResolver } from './resolvers/content.resolver';
import { ContentEntriesModule } from '../content-entries/content-entries.module';
import { AuthModule } from '../../common/auth/auth.module';

/**
 * GraphQL Resolvers Module
 * AI Note: Provides GraphQL resolvers for all entities
 */
@Module({
  imports: [ContentEntriesModule, AuthModule],
  providers: [ContentResolver],
})
export class GraphQLResolversModule {}

