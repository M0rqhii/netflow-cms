import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { OrgGuard } from '../../common/org-site/org.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { Role, Permission } from '../../common/auth/roles.enum';
import { UsersService } from './users.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * UsersController - RESTful API for user management
 * AI Note: All endpoints require authentication and organization context
 */
@UseGuards(AuthGuard, OrgGuard, RolesGuard, PermissionsGuard)
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
   * Note: This endpoint doesn't require organization context as preferences are global
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
   * List all users in the organization (admin only)
   */
  @Get()
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  listUsers(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: { role: string }
  ) {
    return this.usersService.listUsers(orgId, user.role);
  }

  /**
   * GET /api/v1/users/invites
   * Get all invites for the current organization (admin only)
   */
  @Get('invites')
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  getInvites(@CurrentOrg() orgId: string, @CurrentSite() siteId: string) {
    return this.usersService.listInvites(orgId, siteId);
  }

  /**
   * POST /api/v1/users/invites
   * Create a new invite for a user (admin only)
   */
  @Post('invites')
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  createInvite(
    @CurrentOrg() orgId: string,
    @CurrentSite() siteId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(z.object({
      email: z.string().email('Invalid email format'),
      role: z.enum(['org_admin', 'editor', 'viewer', 'site_admin']).default('viewer'),
    }))) body: { email: string; role: string }
  ) {
    return this.usersService.createInvite(orgId, siteId, body, user.id);
  }

  /**
   * DELETE /api/v1/users/invites/:id
   * Revoke a pending invite (admin only)
   */
  @Delete('invites/:id')
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @Param('id') inviteId: string,
    @CurrentOrg() orgId: string,
    @CurrentSite() siteId: string,
    @CurrentUser() user: { id: string }
  ) {
    await this.usersService.revokeInvite(orgId, siteId, inviteId, user.id);
    return;
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID (admin only)
   */
  @Get(':id')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_READ)
  getUserById(
    @Param('id') userId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: { role: string }
  ) {
    return this.usersService.getUserById(userId, orgId, user.role);
  }

  /**
   * POST /api/v1/users
   * Create a new user (admin only)
   * Security: Only super_admin can create super_admin users
   */
  @Post()
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: { role: string },
    @Body(new ZodValidationPipe(z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      role: z.enum(['super_admin', 'org_admin', 'editor', 'viewer', 'site_admin']),
      preferredLanguage: z.enum(['pl', 'en']).optional().default('en'),
    }))) body: { email: string; password: string; role: string; preferredLanguage?: 'pl' | 'en' }
  ) {
    return this.usersService.createUser(orgId, body, user.role);
  }

  /**
   * PATCH /api/v1/users/:id/role
   * Update user role (admin only)
   * Security: Only super_admin can assign super_admin role
   */
  @Patch(':id/role')
  @Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.USERS_WRITE)
  updateUserRole(
    @Param('id') userId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: { role: string },
    @Body(new ZodValidationPipe(z.object({
      role: z.enum(['super_admin', 'org_admin', 'editor', 'viewer', 'site_admin']),
    }))) body: { role: string }
  ) {
    return this.usersService.updateUserRole(userId, orgId, body.role, user.role);
  }
}


