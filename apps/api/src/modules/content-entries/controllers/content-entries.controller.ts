import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/tenant/tenant.guard';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Permission } from '../../../common/auth/roles.enum';
import { ContentEntriesService } from '../services/content-entries.service';
import {
  CreateContentEntryDtoSchema,
  UpdateContentEntryDtoSchema,
  ContentEntryQueryDtoSchema,
} from '../dto';

/**
 * ContentEntriesController - RESTful API dla Content Entries
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Tenant-ID header
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('content/:contentTypeSlug')
export class ContentEntriesController {
  constructor(private readonly contentEntriesService: ContentEntriesService) {}

  @Post()
  @Permissions(Permission.CONTENT_WRITE)
  create(
    @CurrentTenant() tenantId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Body() body: unknown
  ) {
    const dto = CreateContentEntryDtoSchema.parse(body);
    return this.contentEntriesService.create(tenantId, contentTypeSlug, dto);
  }

  @Get()
  @Permissions(Permission.CONTENT_READ)
  list(
    @CurrentTenant() tenantId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Query() query: unknown
  ) {
    const dto = ContentEntryQueryDtoSchema.parse(query);
    return this.contentEntriesService.list(tenantId, contentTypeSlug, dto);
  }

  @Get(':id')
  @Permissions(Permission.CONTENT_READ)
  get(
    @CurrentTenant() tenantId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string
  ) {
    return this.contentEntriesService.get(tenantId, contentTypeSlug, id);
  }

  @Patch(':id')
  @Permissions(Permission.CONTENT_WRITE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const dto = UpdateContentEntryDtoSchema.parse(body);
    return this.contentEntriesService.update(tenantId, contentTypeSlug, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONTENT_DELETE)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string
  ) {
    return this.contentEntriesService.remove(tenantId, contentTypeSlug, id);
  }
}

