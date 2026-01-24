import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { ElasticsearchService } from './elasticsearch.service';
import { SearchSyncWorker } from './search-sync.worker';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';
import { AuthModule } from '../../common/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
// Note: @nestjs/schedule is optional - install with: pnpm add @nestjs/schedule
// import { ScheduleModule } from '@nestjs/schedule';

/**
 * Search Module - handles advanced search
 * AI Note: Provides full-text search, faceted search, and search suggestions
 * 
 * Integrates with Elasticsearch/OpenSearch when enabled
 * Falls back to PostgreSQL full-text search when Elasticsearch is disabled
 */
@Module({
  imports: [
    AuthModule,
    ConfigModule,
    // ScheduleModule.forRoot(), // Uncomment when @nestjs/schedule is installed
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    ElasticsearchService,
    SearchSyncWorker,
    PrismaService,
    PrismaOptimizationService,
  ],
  exports: [SearchService, ElasticsearchService],
})
export class SearchModule {}

