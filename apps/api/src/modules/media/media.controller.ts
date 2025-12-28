import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { uploadMediaSchema, queryMediaSchema } from './dto';
import { Request } from 'express';

/**
 * Media Controller - RESTful API for media file management
 * AI Note: All endpoints require authentication and tenant context
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /api/v1/media
   * Upload a media file
   */
  @Post()
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.MEDIA_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|doc|docx|txt)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body(new ZodValidationPipe(uploadMediaSchema))
    body: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.mediaService.upload(req.tenantId, user.id, file, body);
  }

  /**
   * GET /api/v1/media
   * List all media files with pagination
   */
  @Get()
  @Permissions(Permission.MEDIA_READ)
  async findAll(
    @Query(new ZodValidationPipe(queryMediaSchema))
    query: any,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.mediaService.findAll(req.tenantId, query);
  }

  /**
   * GET /api/v1/media/stats
   * Get media library statistics
   */
  @Get('stats')
  @Permissions(Permission.MEDIA_READ)
  async getStats(@Req() req: Request & { tenantId: string }) {
    return this.mediaService.getLibraryStats(req.tenantId);
  }

  /**
   * GET /api/v1/media/:id
   * Get a single media file by ID
   */
  @Get(':id')
  @Permissions(Permission.MEDIA_READ)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
  ) {
    return this.mediaService.findOne(req.tenantId, id);
  }

  /**
   * PUT /api/v1/media/:id
   * Update a media file
   */
  @Put(':id')
  @Roles(Role.EDITOR, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.MEDIA_WRITE)
  async update(
    @Param('id') id: string,
    @Body() body: { filename?: string; alt?: string; metadata?: Record<string, any> },
    @Req() req: Request & { tenantId: string },
  ) {
    return this.mediaService.update(req.tenantId, id, body);
  }

  /**
   * DELETE /api/v1/media/:id
   * Delete a media file
   */
  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.MEDIA_DELETE)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { tenantId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mediaService.remove(req.tenantId, id, user?.id);
  }
}
