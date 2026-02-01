import {
  Controller,
  UseGuards,
  Post,
  Body,
  Query,
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
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CollectionsService } from '../services/collections.service';
import {
  CreateCollectionDtoSchema,
  UpdateCollectionDtoSchema,
  CollectionQueryDtoSchema,
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
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  create(
    @CurrentSite() siteId: string,
    @Body(new ZodValidationPipe(CreateCollectionDtoSchema)) body: any
  ) {
    return this.collectionsService.create(siteId, body as any);
  }

  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  list(@CurrentSite() siteId: string, @Query(new ZodValidationPipe(CollectionQueryDtoSchema)) query: any) {
    return this.collectionsService.list(siteId, query);
  }

  @Get(':slug')
  @Permissions(Permission.COLLECTIONS_READ)
  get(@CurrentSite() siteId: string, @Param('slug') slug: string) {
    return this.collectionsService.getBySlug(siteId, slug);
  }

  @Put(':slug')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  update(
    @CurrentSite() siteId: string,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(UpdateCollectionDtoSchema)) body: any
  ) {
    return this.collectionsService.update(siteId, slug, body as any);
  }

  @Delete(':slug')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_DELETE)
  remove(@CurrentSite() siteId: string, @Param('slug') slug: string) {
    return this.collectionsService.remove(siteId, slug);
  }
}



