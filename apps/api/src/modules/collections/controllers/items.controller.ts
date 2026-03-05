import {
  Controller,
  UseGuards,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Permission } from '../../../common/auth/roles.enum';
import { CollectionItemsService } from '../services/items.service';
import { ItemQueryDtoSchema, UpsertItemDtoSchema } from '../dto';
/**
 * CollectionItemsController - RESTful API dla Collection Items
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Site-ID header
 */
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('collections/:slug/items')
export class CollectionItemsController {
  constructor(private readonly itemsService: CollectionItemsService) {}

  @Get()
  @Permissions(Permission.ITEMS_READ)
  async list(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Query() query: any
  ) {
    const dto = ItemQueryDtoSchema.parse(query);
    return this.itemsService.list(siteId, orgId, slug, dto);
  }

  @Post()
  @Permissions(Permission.ITEMS_WRITE)
  create(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Body() body: any,
    @CurrentUser() user: { id: string }
  ) {
    const dto = UpsertItemDtoSchema.parse(body);
    return this.itemsService.create(siteId, orgId, slug, dto, user.id);
  }

  @Get(':id')
  @Permissions(Permission.ITEMS_READ)
  async get(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response
  ) {
    const item = await this.itemsService.get(siteId, orgId, slug, id);

    // ETag support - 304 Not Modified
    if (ifNoneMatch && ifNoneMatch === item.etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    res.setHeader('ETag', item.etag);
    return res.status(HttpStatus.OK).json(item);
  }

  @Put(':id')
  @Permissions(Permission.ITEMS_WRITE)
  update(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: { id: string }
  ) {
    const dto = UpsertItemDtoSchema.parse(body);
    return this.itemsService.update(siteId, orgId, slug, id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.ITEMS_DELETE)
  remove(
    @CurrentSite() siteId: string,
    @CurrentOrg() orgId: string,
    @Param('slug') slug: string,
    @Param('id') id: string
  ) {
    return this.itemsService.remove(siteId, orgId, slug, id);
  }
}






