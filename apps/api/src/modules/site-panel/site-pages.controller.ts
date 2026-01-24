import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { SitePagesService } from './site-pages.service';
import {
  CreatePageDtoSchema,
  PageQueryDtoSchema,
  PublishPageDtoSchema,
  UpdatePageDtoSchema,
  UpdatePageContentDtoSchema,
} from './dto';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/pages')
export class SitePagesController {
  constructor(private readonly pages: SitePagesService) {}

  @Get()
  @Throttle(1000, 60) // 1000 requests per minute - high limit for page list operations
  @Permissions(Permission.PAGES_READ)
  list(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Query(new ZodValidationPipe(PageQueryDtoSchema)) query: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.list(siteId, query as any);
  }

  @Post()
  @Permissions(Permission.PAGES_WRITE)
  create(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreatePageDtoSchema)) body: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.create(siteId, body as any, user?.id);
  }

  @Get(':pageId')
  @Throttle(1000, 60) // 1000 requests per minute - high limit for page get operations
  @Permissions(Permission.PAGES_READ)
  get(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Param('pageId') pageId: string,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.getById(siteId, pageId);
  }

  @Patch(':pageId')
  @Permissions(Permission.PAGES_WRITE)
  update(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdatePageDtoSchema)) body: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.update(siteId, pageId, body as any, user?.id);
  }

  @Post(':pageId/publish')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.PAGES_PUBLISH)
  publish(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(PublishPageDtoSchema)) body: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.publish(siteId, pageId, body as any, user?.id);
  }

  @Delete(':pageId')
  @Permissions(Permission.PAGES_WRITE)
  delete(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.delete(siteId, pageId, user?.id);
  }

  @Patch(':pageId/content')
  @Permissions(Permission.PAGES_WRITE)
  updateContent(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdatePageContentDtoSchema)) body: unknown,
  ) {
    // siteId is validated by middleware to match currentSiteId
    return this.pages.updateContent(siteId, pageId, (body as any).content, user?.id);
  }
}
