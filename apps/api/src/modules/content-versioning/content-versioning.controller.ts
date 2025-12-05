import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ContentVersioningService } from './content-versioning.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('api/v1/collections/:collectionSlug/items/:itemId/versions')
@UseGuards(AuthGuard, PermissionsGuard)
export class ContentVersioningController {
  constructor(
    private readonly versioningService: ContentVersioningService,
  ) {}

  /**
   * Get version history for an item
   */
  @Get()
  @Permissions(Permission.ITEMS_READ)
  async getVersionHistory(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.versioningService.getVersionHistory(tenantId, itemId);
  }

  /**
   * Get a specific version
   */
  @Get(':version')
  @Permissions(Permission.ITEMS_READ)
  async getVersion(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Param('version') version: string,
  ) {
    return this.versioningService.getVersion(
      tenantId,
      itemId,
      parseInt(version, 10),
    );
  }

  /**
   * Get diff between two versions
   */
  @Get('diff/:version1/:version2')
  @Permissions(Permission.ITEMS_READ)
  async getVersionDiff(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Param('version1') version1: string,
    @Param('version2') version2: string,
  ) {
    return this.versioningService.getVersionDiff(
      tenantId,
      itemId,
      parseInt(version1, 10),
      parseInt(version2, 10),
    );
  }

  /**
   * Restore a version
   */
  @Post(':version/restore')
  @Permissions(Permission.ITEMS_UPDATE)
  async restoreVersion(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Param('version') version: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body?: { changeNote?: string },
  ) {
    return this.versioningService.restoreVersion(
      tenantId,
      itemId,
      parseInt(version, 10),
      user.id,
      body?.changeNote,
    );
  }
}

