import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';

/**
 * Search Module - handles advanced search
 * AI Note: Provides full-text search, faceted search, and search suggestions
 * 
 * For MVP, uses Prisma full-text search
 * In production, integrate with Elasticsearch
 */
@Module({
  imports: [AuthModule, TenantModule],
  controllers: [SearchController],
  providers: [SearchService, PrismaService],
  exports: [SearchService],
})
export class SearchModule {}

