import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateSnapshotDtoSchema } from './dto';
import { SnapshotsService } from './snapshots.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/snapshots')
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(@Param('siteId') siteId: string, @CurrentSite() _: string) {
    return this.snapshots.list(siteId);
  }

  @Post()
  @Permissions(Permission.PAGES_WRITE)
  create(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateSnapshotDtoSchema)) body: any,
  ) {
    // siteId is validated by middleware to match currentSiteId
    const payload = body as { label?: string };
    return this.snapshots.createSnapshot(siteId, user?.id ?? null, payload?.label);
  }

  @Post(':snapshotId/restore')
  @Permissions(Permission.PAGES_WRITE)
  restore(
    @Param('siteId') siteId: string,
    @Param('snapshotId') snapshotId: string,
    @CurrentSite() _: string, // Validated by middleware
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.snapshots.restoreSnapshot(siteId, snapshotId, user?.id ?? null);
  }
}
