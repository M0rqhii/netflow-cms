import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CollectionRolesService } from './collection-roles.service';
import {
  createCollectionRoleSchema,
  updateCollectionRoleSchema,
} from './dto';

/**
 * Collection Roles Controller
 * AI Note: RESTful API for per-collection RBAC
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('collections/:collectionId/roles')
export class CollectionRolesController {
  constructor(private readonly collectionRolesService: CollectionRolesService) {}

  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  assignRole(
    @CurrentSite() siteId: string,
    @Param('collectionId') collectionId: string,
    @Body(new ZodValidationPipe(createCollectionRoleSchema)) dto: unknown,
  ) {
    return this.collectionRolesService.assignRole(siteId, collectionId, dto as any);
  }

  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  getCollectionRoles(
    @CurrentSite() siteId: string,
    @Param('collectionId') collectionId: string,
  ) {
    return this.collectionRolesService.getCollectionRoles(siteId, collectionId);
  }

  @Put(':userId')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  updateRole(
    @CurrentSite() siteId: string,
    @Param('collectionId') collectionId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateCollectionRoleSchema)) dto: unknown,
  ) {
    return this.collectionRolesService.updateRole(siteId, collectionId, userId, dto as any);
  }

  @Delete(':userId')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.COLLECTIONS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRole(
    @CurrentSite() siteId: string,
    @Param('collectionId') collectionId: string,
    @Param('userId') userId: string,
  ) {
    return this.collectionRolesService.removeRole(siteId, collectionId, userId);
  }
}

