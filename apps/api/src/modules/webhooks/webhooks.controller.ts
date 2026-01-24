import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Role, Permission } from '../../common/auth/roles.enum';
import { WebhooksService } from './webhooks.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWebhookSchema, updateWebhookSchema } from './dto';
import { CurrentSite } from '../../common/decorators/current-site.decorator';

/**
 * Webhooks Controller - RESTful API for webhook management
 * AI Note: All endpoints require authentication and site context
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /api/v1/webhooks
   * Create a webhook
   */
  @Post()
  @Roles(Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE) // Webhooks are collection-related
  async create(
    @Body(new ZodValidationPipe(createWebhookSchema))
    body: any,
    @CurrentSite() siteId: string,
  ) {
    return this.webhooksService.create(siteId, body);
  }

  /**
   * GET /api/v1/webhooks
   * List all webhooks for a site (optionally filtered by collection)
   */
  @Get()
  @Permissions(Permission.COLLECTIONS_READ) // Webhooks are collection-related
  async findAll(
    @Query('collectionId') collectionId: string | undefined,
    @CurrentSite() siteId: string,
  ) {
    return this.webhooksService.findAll(siteId, collectionId);
  }

  /**
   * GET /api/v1/webhooks/:id
   * Get a single webhook by ID
   */
  @Get(':id')
  @Permissions(Permission.COLLECTIONS_READ) // Webhooks are collection-related
  async findOne(
    @Param('id') id: string,
    @CurrentSite() siteId: string,
  ) {
    return this.webhooksService.findOne(siteId, id);
  }

  /**
   * PUT /api/v1/webhooks/:id
   * Update a webhook
   */
  @Put(':id')
  @Roles(Role.EDITOR, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE) // Webhooks are collection-related
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWebhookSchema))
    body: any,
    @CurrentSite() siteId: string,
  ) {
    return this.webhooksService.update(siteId, id, body);
  }

  /**
   * DELETE /api/v1/webhooks/:id
   * Delete a webhook
   */
  @Delete(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_DELETE) // Webhooks are collection-related
  async remove(
    @Param('id') id: string,
    @CurrentSite() siteId: string,
  ) {
    return this.webhooksService.remove(siteId, id);
  }
}

