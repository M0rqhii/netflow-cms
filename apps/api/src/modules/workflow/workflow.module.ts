import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthModule } from '../../common/auth/auth.module';
import { TenantModule } from '../../common/tenant/tenant.module';

/**
 * Workflow Module - handles workflow management and execution
 * AI Note: Provides endpoints for managing workflows and executing state transitions
 */
@Module({
  imports: [AuthModule, TenantModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, PrismaService],
  exports: [WorkflowService],
})
export class WorkflowModule {}

