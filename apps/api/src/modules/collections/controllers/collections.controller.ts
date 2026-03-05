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
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { Permission } from '../../../common/auth/roles.enum';
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
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @Permissions(Permission.COLLECTIONS_WRITE)
  create(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(CreateCollectionDtoSchema)) body: any
  ) {
    return this.collectionsService.create(siteId, orgId, body as any);
  }

  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  list(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(CollectionQueryDtoSchema)) query: any
  ) {
    return this.collectionsService.list(siteId, orgId, query);
  }

  @Get(':slug')
  @Permissions(Permission.COLLECTIONS_READ)
  get(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string
  ) {
    return this.collectionsService.getBySlug(siteId, orgId, slug);
  }

  @Put(':slug')
  @Permissions(Permission.COLLECTIONS_WRITE)
  update(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(UpdateCollectionDtoSchema)) body: any
  ) {
    return this.collectionsService.update(siteId, orgId, slug, body as any);
  }

  @Delete(':slug')
  @Permissions(Permission.COLLECTIONS_DELETE)
  remove(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string
  ) {
    return this.collectionsService.remove(siteId, orgId, slug);
  }
}



