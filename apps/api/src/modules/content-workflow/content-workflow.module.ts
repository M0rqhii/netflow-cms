import { Module } from '@nestjs/common';
import { ContentWorkflowController } from './controllers/content-workflow.controller';
import { ContentWorkflowService } from './services/content-workflow.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentTypesModule } from '../content-types/content-types.module';

/**
 * ContentWorkflowModule - Module dla workflow treści (review, comments)
 * AI Note: Provides review and comment functionality for content entries
 */
@Module({
  imports: [ContentTypesModule],
  controllers: [ContentWorkflowController],
  providers: [ContentWorkflowService, PrismaService],
  exports: [ContentWorkflowService],
})
export class ContentWorkflowModule {}

