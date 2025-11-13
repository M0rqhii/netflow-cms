import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { WebhooksService } from './webhooks.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWebhookSchema, updateWebhookSchema } from './dto';
import { Request } from 'express';

/**
 * Webhooks Controller - RESTful API for webhook management
 * AI Note: All endpoints require authentication and tenant context
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/v1/webhooks
   * Create a webhook
   */
  @Post()
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body(new ZodValidationPipe(createWebhookSchema))
    body: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.webhooksService.create(req.tenantId, body);
  }

  /**
   * GET /api/v1/webhooks
   * List all webhooks for a tenant
   */
  @Get()
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async findAll(@Req() req: Request & { tenantId: string }) {
    return this.webhooksService.findAll(req.tenantId);
  }

  /**
   * GET /api/v1/webhooks/:id
   * Get a single webhook by ID
   */
  @Get(':id')
  @Roles(Role.VIEWER, Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.webhooksService.findOne(req.tenantId, id);
  }

  /**
   * PUT /api/v1/webhooks/:id
   * Update a webhook
   */
  @Put(':id')
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWebhookSchema))
    body: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.webhooksService.update(req.tenantId, id, body);
  }

  /**
   * DELETE /api/v1/webhooks/:id
   * Delete a webhook
   */
  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.webhooksService.remove(req.tenantId, id);
  }
}

