import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';

/**
 * Tasks Module
 * AI Note: Module for workflow tasks management
 */
@Module({
  controllers: [TasksController],
  providers: [TasksService, PrismaService, PrismaOptimizationService],
  exports: [TasksService],
})
export class TasksModule {}

