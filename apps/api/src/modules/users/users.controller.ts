import {
  Controller,
  Get,
  UseGuards,
  Param,
  } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { TenantGuard } from '../../common/tenant/tenant.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role, Permission } from '../../common/auth/roles.enum';
import { UsersService } from './users.service';

/**
 * UsersController - RESTful API for user management
 * AI Note: All endpoints require authentication and tenant context
 */
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   * Get current authenticated user information
   */
  @Get('me')
  getCurrentUser(@CurrentUser() user: { id: string }) {
    return this.usersService.getCurrentUser(user.id);
  }

  /**
   * GET /api/v1/users
   * List all users in the tenant (admin only)
   */
  @Get()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  listUsers(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role: string }
  ) {
    return this.usersService.listUsers(tenantId, user.role);
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID (admin only)
   */
  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  getUserById(
    @Param('id') userId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role: string }
  ) {
    return this.usersService.getUserById(userId, tenantId, user.role);
  }
}


