import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Role } from '../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWorkflowSchema } from './dto/create-workflow.dto';
import { Request } from 'express';

/**
 * Workflow Controller - RESTful API for workflow management
 * AI Note: All endpoints require authentication and tenant context
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * POST /api/v1/workflows
   * Create a workflow
   */
  @Post()
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body(new ZodValidationPipe(createWorkflowSchema))
    body: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.workflowService.create(req.tenantId, body);
  }

  /**
   * GET /api/v1/workflows
   * List all workflows for a tenant
   */
  @Get()
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async findAll(@Req() req: Request & { tenantId: string }) {
    return this.workflowService.findAll(req.tenantId);
  }

  /**
   * GET /api/v1/workflows/:id
   * Get a single workflow by ID
   */
  @Get(':id')
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.workflowService.findOne(req.tenantId, id);
  }

  /**
   * POST /api/v1/workflows/:id/execute
   * Execute workflow transition
   */
  @Post(':id/execute')
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async executeTransition(
    @Param('id') id: string,
    @Body() body: { entityId: string; entityType: 'content' | 'collection'; transitionName: string },
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.workflowService.executeTransition(
      req.tenantId,
      id,
      body.entityId,
      body.entityType,
      body.transitionName,
      user.id,
    );
  }
}

