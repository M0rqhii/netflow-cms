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
import { TenantGuard } from '../../../common/tenant/tenant.guard';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Role, Permission } from '../../../common/auth/roles.enum';
import { ContentTypesService } from '../services/content-types.service';
import {
  CreateContentTypeDtoSchema,
  UpdateContentTypeDtoSchema,
} from '../dto';

/**
 * ContentTypesController - RESTful API dla Content Types
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Tenant-ID header
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_WRITE)
  create(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown
  ) {
    const dto = CreateContentTypeDtoSchema.parse(body);
    return this.contentTypesService.create(tenantId, dto);
  }

  @Get()
  @Permissions(Permission.CONTENT_TYPES_READ)
  list(@CurrentTenant() tenantId: string) {
    return this.contentTypesService.list(tenantId);
  }

  @Get(':id')
  @Permissions(Permission.CONTENT_TYPES_READ)
  get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.contentTypesService.getById(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_WRITE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const dto = UpdateContentTypeDtoSchema.parse(body);
    return this.contentTypesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_TYPES_DELETE)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.contentTypesService.remove(tenantId, id);
  }
}





