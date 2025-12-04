import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PlatformRolesGuard } from '../../common/auth/guards/platform-roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { PlatformRoles } from '../../common/auth/decorators/platform-roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { PlatformRole, Permission } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantsService } from './tenants.service';
import { BillingService } from '../billing/billing.service';
import {
  CreateTenantDtoSchema,
  UpdateTenantDtoSchema,
} from './dto';

/**
 * TenantsController - RESTful API for tenant management
 * AI Note: All endpoints require platform-level roles (platform_admin or org_owner)
 * This is platform-level functionality, not tenant-scoped
 */
@UseGuards(AuthGuard, PlatformRolesGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/v1/tenants
   * Create a new tenant (platform_admin only)
   */
  @Post()
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
  @Permissions(Permission.TENANTS_WRITE)
  create(@Body() body: unknown) {
    const createTenantDto = CreateTenantDtoSchema.parse(body);
    return this.tenantsService.create(createTenantDto);
  }

  /**
   * GET /api/v1/tenants
   * List all tenants with pagination (platform_admin or org_owner)
   */
  @Get()
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN, PlatformRole.ORG_OWNER)
  @Permissions(Permission.TENANTS_READ)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.tenantsService.findAll(page, pageSize);
  }

  /**
   * GET /api/v1/tenants/slug/:slug
   * Get tenant by slug (platform_admin or org_owner)
   * NOTE: Must be before :id route to avoid routing conflicts
   */
  @Get('slug/:slug')
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN, PlatformRole.ORG_OWNER)
  @Permissions(Permission.TENANTS_READ)
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  /**
   * GET /api/v1/tenants/:id
   * Get tenant by ID (platform_admin or org_owner)
   */
  @Get(':id')
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN, PlatformRole.ORG_OWNER)
  @Permissions(Permission.TENANTS_READ)
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  /**
   * PATCH /api/v1/tenants/:id
   * Update tenant (platform_admin only)
   */
  @Patch(':id')
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
  @Permissions(Permission.TENANTS_WRITE)
  update(@Param('id') id: string, @Body() body: unknown) {
    const updateTenantDto = UpdateTenantDtoSchema.parse(body);
    return this.tenantsService.update(id, updateTenantDto);
  }

  /**
   * DELETE /api/v1/tenants/:id
   * Delete tenant (platform_admin only)
   */
  @Delete(':id')
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
  @Permissions(Permission.TENANTS_DELETE)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  /**
   * GET /api/v1/tenants/:id/subscription
   * Get subscription for a specific tenant (user must have access to this tenant)
   */
  @Get(':id/subscription')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getTenantSubscription(
    @CurrentUser() user: { id: string },
    @Param('id') tenantId: string,
  ) {
    // Verify user has access to this tenant
    const membership = await this.prisma.userTenant.findFirst({
      where: {
        userId: user.id,
        tenantId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.billingService.getTenantSubscription(tenantId);
  }

  /**
   * GET /api/v1/tenants/:id/invoices
   * Get invoices for a specific tenant (user must have access to this tenant)
   */
  @Get(':id/invoices')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions(Permission.BILLING_READ)
  async getTenantInvoices(
    @CurrentUser() user: { id: string },
    @Param('id') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    // Verify user has access to this tenant
    const membership = await this.prisma.userTenant.findFirst({
      where: {
        userId: user.id,
        tenantId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.billingService.getTenantInvoices(tenantId, page, pageSize);
  }
}


