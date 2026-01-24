import { Module } from '@nestjs/common';
// @ts-ignore - GraphQL packages not installed yet
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
// @ts-ignore - GraphQL packages not installed yet
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AuthModule } from '../../common/auth/auth.module';

/**
 * GraphQL Module - provides GraphQL API endpoint
 * AI Note: GraphQL API for querying and mutating data
 * 
 * Note: Requires @nestjs/graphql and @nestjs/apollo packages
 * Install: npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express
 */
@Module({
  imports: [
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      useFactory: () => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: process.env.NODE_ENV !== 'production',
        introspection: process.env.NODE_ENV !== 'production',
        context: ({ req }: { req: any }) => ({ req }),
        // Authentication and org/site context are handled in resolvers
      }),
    }),
  ],
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}

