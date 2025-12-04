import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowConfigService } from './workflow-config.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { TasksModule } from '../tasks/tasks.module';

/**
 * Workflow Module - handles workflow management and execution
 * AI Note: Provides endpoints for managing workflows and executing state transitions
 */
@Module({
  imports: [AuthModule, TenantModule, TasksModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowConfigService, PrismaService],
  exports: [WorkflowService, WorkflowConfigService],
})
export class WorkflowModule {}

