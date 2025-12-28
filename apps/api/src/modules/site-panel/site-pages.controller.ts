import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
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

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/pages')
export class SitePagesController {
  constructor(private readonly pages: SitePagesService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(PageQueryDtoSchema)) query: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.list(tenantId, query as any);
  }

  @Post()
  @Permissions(Permission.PAGES_WRITE)
  create(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreatePageDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.create(tenantId, body as any, user?.id);
  }

  @Get(':pageId')
  @Permissions(Permission.PAGES_READ)
  get(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Param('pageId') pageId: string,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.getById(tenantId, pageId);
  }

  @Patch(':pageId')
  @Permissions(Permission.PAGES_WRITE)
  update(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdatePageDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.update(tenantId, pageId, body as any, user?.id);
  }

  @Post(':pageId/publish')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.PAGES_PUBLISH)
  publish(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(PublishPageDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.publish(tenantId, pageId, body as any, user?.id);
  }

  @Delete(':pageId')
  @Permissions(Permission.PAGES_WRITE)
  delete(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.delete(tenantId, pageId, user?.id);
  }

  @Patch(':pageId/content')
  @Permissions(Permission.PAGES_WRITE)
  updateContent(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Param('pageId') pageId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UpdatePageContentDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.pages.updateContent(tenantId, pageId, (body as any).content, user?.id);
  }
}
