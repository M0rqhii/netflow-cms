import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/tenant/tenant.guard';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Role, Permission } from '../../../common/auth/roles.enum';
import { CollectionsService } from '../services/collections.service';
import {
  CreateCollectionDtoSchema,
  UpdateCollectionDtoSchema,
} from '../dto';

/**
 * CollectionsController - RESTful API dla Collections
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Tenant-ID header
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  create(
    @CurrentTenant() tenantId: string,
    @Body() body: unknown
  ) {
    const dto = CreateCollectionDtoSchema.parse(body);
    return this.collectionsService.create(tenantId, dto);
  }

  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  list(@CurrentTenant() tenantId: string) {
    return this.collectionsService.list(tenantId);
  }

  @Get(':slug')
  @Permissions(Permission.COLLECTIONS_READ)
  get(@CurrentTenant() tenantId: string, @Param('slug') slug: string) {
    return this.collectionsService.getBySlug(tenantId, slug);
  }

  @Put(':slug')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  update(
    @CurrentTenant() tenantId: string,
    @Param('slug') slug: string,
    @Body() body: unknown
  ) {
    const dto = UpdateCollectionDtoSchema.parse(body);
    return this.collectionsService.update(tenantId, slug, dto);
  }

  @Delete(':slug')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_DELETE)
  remove(@CurrentTenant() tenantId: string, @Param('slug') slug: string) {
    return this.collectionsService.remove(tenantId, slug);
  }
}

