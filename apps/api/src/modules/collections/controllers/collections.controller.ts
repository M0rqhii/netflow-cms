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
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Roles } from '../../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { Role, Permission } from '../../../common/auth/roles.enum';
import { CollectionsService } from '../services/collections.service';
import {
  CreateCollectionDtoSchema,
  UpdateCollectionDtoSchema,
} from '../dto';

/**
 * CollectionsController - RESTful API dla Collections
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Site-ID header
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  create(
    @CurrentSite() siteId: string,
    @Body() body: unknown
  ) {
    const dto = CreateCollectionDtoSchema.parse(body);
    return this.collectionsService.create(siteId, dto);
  }

  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  list(@CurrentSite() siteId: string) {
    return this.collectionsService.list(siteId);
  }

  @Get(':slug')
  @Permissions(Permission.COLLECTIONS_READ)
  get(@CurrentSite() siteId: string, @Param('slug') slug: string) {
    return this.collectionsService.getBySlug(siteId, slug);
  }

  @Put(':slug')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  update(
    @CurrentSite() siteId: string,
    @Param('slug') slug: string,
    @Body() body: unknown
  ) {
    const dto = UpdateCollectionDtoSchema.parse(body);
    return this.collectionsService.update(siteId, slug, dto);
  }

  @Delete(':slug')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_DELETE)
  remove(@CurrentSite() siteId: string, @Param('slug') slug: string) {
    return this.collectionsService.remove(siteId, slug);
  }
}

