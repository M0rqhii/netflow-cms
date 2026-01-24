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
import { SiteGuard } from '../../common/org-site/site.guard';
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
 * AI Note: All endpoints require authentication and site context
 */
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * POST /api/v1/workflows
   * Create a workflow
   */
  @Post()
  @Roles(Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body(new ZodValidationPipe(createWorkflowSchema))
    body: any,
    @Req() req: Request & { siteId: string },
  ) {
    return this.workflowService.create(req.siteId, body);
  }

  /**
   * GET /api/v1/workflows
   * List all workflows for a site
   */
  @Get()
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async findAll(@Req() req: Request & { siteId: string }) {
    return this.workflowService.findAll(req.siteId);
  }

  /**
   * GET /api/v1/workflows/:id
   * Get a single workflow by ID
   */
  @Get(':id')
  @Roles(Role.VIEWER, Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { siteId: string },
  ) {
    return this.workflowService.findOne(req.siteId, id);
  }

  /**
   * POST /api/v1/workflows/:id/execute
   * Execute workflow transition
   */
  @Post(':id/execute')
  @Roles(Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  async executeTransition(
    @Param('id') id: string,
    @Body() body: { entityId: string; entityType: 'content' | 'collection'; transitionName: string },
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { siteId: string },
  ) {
    return this.workflowService.executeTransition(
      req.siteId,
      id,
      body.entityId,
      body.entityType,
      body.transitionName,
      user.id,
    );
  }
}

