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
import { AuthGuard } from '../../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../../common/auth/guards/permissions.guard';
import { Permissions } from '../../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../../common/decorators/current-site.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/auth/decorators/current-user.decorator';
import { Permission } from '../../../common/auth/roles.enum';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ContentEntriesService } from '../services/content-entries.service';
import {
  CreateContentEntryDtoSchema,
  UpdateContentEntryDtoSchema,
  ContentEntryQueryDtoSchema,
} from '../dto';

/**
 * ContentEntriesController - RESTful API dla Content Entries
 * AI Note: Wszystkie endpointy wymagają autentykacji i X-Site-ID header
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('content/:contentTypeSlug')
export class ContentEntriesController {
  constructor(private readonly contentEntriesService: ContentEntriesService) {}

  @Post()
  @Permissions(Permission.CONTENT_WRITE)
  create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Body(new ZodValidationPipe(CreateContentEntryDtoSchema)) body: any
  ) {
    return this.contentEntriesService.create(siteId, contentTypeSlug, body as any, user.id);
  }

  @Get()
  @Permissions(Permission.CONTENT_READ)
  list(
    @CurrentSite() siteId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Query(new ZodValidationPipe(ContentEntryQueryDtoSchema)) query: any
  ) {
    return this.contentEntriesService.list(siteId, contentTypeSlug, query as any);
  }

  @Get(':id')
  @Permissions(Permission.CONTENT_READ)
  get(
    @CurrentSite() siteId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string
  ) {
    return this.contentEntriesService.get(siteId, contentTypeSlug, id);
  }

  @Patch(':id')
  @Permissions(Permission.CONTENT_WRITE)
  update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContentEntryDtoSchema)) body: any
  ) {
    return this.contentEntriesService.update(siteId, contentTypeSlug, id, body as any, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.CONTENT_DELETE)
  remove(
    @CurrentSite() siteId: string,
    @Param('contentTypeSlug') contentTypeSlug: string,
    @Param('id') id: string
  ) {
    return this.contentEntriesService.remove(siteId, contentTypeSlug, id);
  }
}


