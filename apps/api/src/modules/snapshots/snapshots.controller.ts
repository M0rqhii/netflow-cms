import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateSnapshotDtoSchema } from './dto';
import { SnapshotsService } from './snapshots.service';

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/snapshots')
export class SnapshotsController {
  constructor(private readonly snapshots: SnapshotsService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Get()
  @Permissions(Permission.PAGES_READ)
  list(@Param('siteId') siteId: string, @CurrentTenant() tenantId: string) {
    this.assertTenantScope(siteId, tenantId);
    return this.snapshots.list(siteId);
  }

  @Post()
  @Permissions(Permission.PAGES_WRITE)
  create(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreateSnapshotDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    const payload = body as { label?: string };
    return this.snapshots.createSnapshot(siteId, user?.id ?? null, payload?.label);
  }

  @Post(':snapshotId/restore')
  @Permissions(Permission.PAGES_WRITE)
  restore(
    @Param('siteId') siteId: string,
    @Param('snapshotId') snapshotId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.snapshots.restoreSnapshot(siteId, snapshotId, user?.id ?? null);
  }
}
