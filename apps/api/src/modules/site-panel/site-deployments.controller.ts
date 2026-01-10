import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { SiteDeploymentsService } from './site-deployments.service';
import {
  PublishDeploymentDtoSchema,
  DeploymentQueryDtoSchema,
} from './dto';

@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('site-panel/:siteId/deployments')
export class SiteDeploymentsController {
  constructor(private readonly deployments: SiteDeploymentsService) {}

  private assertTenantScope(siteId: string, tenantId: string) {
    if (siteId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed.');
    }
  }

  @Post('publish')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.PAGES_PUBLISH)
  publish(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(PublishDeploymentDtoSchema)) body: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.deployments.publish(tenantId, body as any, user?.id);
  }

  @Get()
  @Throttle(1000, 60) // 1000 requests per minute - high limit for deployment list operations
  @Permissions(Permission.PAGES_READ)
  list(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(DeploymentQueryDtoSchema)) query: unknown,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.deployments.list(tenantId, query as any);
  }

  @Get('latest')
  @Throttle(1000, 60) // 1000 requests per minute - high limit for latest deployment operations
  @Permissions(Permission.PAGES_READ)
  getLatest(
    @Param('siteId') siteId: string,
    @CurrentTenant() tenantId: string,
    @Query('env') env?: string,
  ) {
    this.assertTenantScope(siteId, tenantId);
    return this.deployments.getLatest(tenantId, env);
  }
}





