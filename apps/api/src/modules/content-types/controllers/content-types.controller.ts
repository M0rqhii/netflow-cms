import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { Role, Permission } from '../../../common/auth/roles.enum';
import { ContentTypesService } from '../services/content-types.service';
import {
  CreateContentTypeDtoSchema,
  UpdateContentTypeDtoSchema,
} from '../dto';

/**
 * ContentTypesController - RESTful API dla Content Types
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Site-ID header
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_WRITE)
  create(
    @CurrentSite() siteId: string,
    @Body(new ZodValidationPipe(CreateContentTypeDtoSchema)) body: any
  ) {
    const dto = CreateContentTypeDtoSchema.parse(body);
    return this.contentTypesService.create(siteId, dto);
  }

  @Get()
  @Permissions(Permission.CONTENT_TYPES_READ)
  list(@CurrentSite() siteId: string) {
    return this.contentTypesService.list(siteId);
  }

  @Get(':id')
  @Permissions(Permission.CONTENT_TYPES_READ)
  get(@CurrentSite() siteId: string, @Param('id') id: string) {
    return this.contentTypesService.getById(siteId, id);
  }

  @Patch(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_WRITE)
  update(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContentTypeDtoSchema)) body: any
  ) {
    const dto = UpdateContentTypeDtoSchema.parse(body);
    return this.contentTypesService.update(siteId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_DELETE)
  remove(@CurrentSite() siteId: string, @Param('id') id: string) {
    return this.contentTypesService.remove(siteId, id);
  }
}








