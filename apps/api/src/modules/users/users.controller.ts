import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
  } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

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
   * PATCH /api/v1/users/me/preferences
   * Update current user preferences (language, etc.)
   * Note: This endpoint doesn't require tenant context as preferences are global
   */
  @Patch('me/preferences')
  @UseGuards(AuthGuard)
  updatePreferences(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(z.object({
      preferredLanguage: z.enum(['pl', 'en']).optional(),
    }))) body: { preferredLanguage?: 'pl' | 'en' }
  ) {
    return this.usersService.updatePreferences(user.id, body);
  }

  /**
   * GET /api/v1/users
   * List all users in the tenant (admin only)
   */
  @Get()
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  listUsers(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { role: string }
  ) {
    return this.usersService.listUsers(tenantId, user.role);
  }

  /**
   * GET /api/v1/users/invites
   * Get all invites for the current tenant (admin only)
   */
  @Get('invites')
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  getInvites(@CurrentTenant() _tenantId: string) {
    // Return empty array for now - invites functionality can be implemented later
    // tenantId will be used when implementing invites functionality
    return [];
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


