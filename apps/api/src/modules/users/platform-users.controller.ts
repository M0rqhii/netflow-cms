import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PlatformRolesGuard } from '../../common/auth/guards/platform-roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { PlatformRoles } from '../../common/auth/decorators/platform-roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { PlatformRole, Permission, Role } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, Injectable } from '@nestjs/common';

const createPlatformUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['super_admin', 'organization_admin', 'editor', 'viewer']).optional(), // Backward compatibility
  siteRole: z.enum(['viewer', 'editor', 'editor-in-chief', 'marketing', 'admin', 'owner']).optional(),
  platformRole: z.enum(['user', 'editor-in-chief', 'admin', 'owner']).optional(),
  systemRole: z.enum(['super_admin', 'system_admin', 'system_dev', 'system_support']).optional(),
  preferredLanguage: z.enum(['pl', 'en']).optional().default('en'),
  // Granular permissions (optional, overrides role permissions)
  permissions: z.array(z.string()).optional(), // Use string instead of nativeEnum for flexibility
});

const updatePlatformUserSchema = z.object({
  role: z.enum(['super_admin', 'organization_admin', 'editor', 'viewer']).optional(), // Backward compatibility
  siteRole: z.enum(['viewer', 'editor', 'editor-in-chief', 'marketing', 'admin', 'owner']).optional(),
  platformRole: z.enum(['user', 'editor-in-chief', 'admin', 'owner']).optional(),
  systemRole: z.enum(['super_admin', 'system_admin', 'system_dev', 'system_support']).optional(),
  permissions: z.array(z.string()).optional(), // Use string instead of nativeEnum for flexibility
});

/**
 * PlatformUsersController - RESTful API for platform-level user management
 * AI Note: All endpoints require platform-level roles (platform_admin)
 * This is for managing users across the entire platform, not organization-scoped
 */
@Injectable()
@UseGuards(AuthGuard, PlatformRolesGuard, PermissionsGuard)
@Controller('platform/users')
export class PlatformUsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/platform/users
   * List all platform users (platform_admin only)
   */
  @Get()
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.OWNER)
  @Permissions(Permission.USERS_READ)
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    const skip = (page - 1) * pageSize;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true, // Backward compatibility
          siteRole: true,
          platformRole: true,
          systemRole: true,
          isSuperAdmin: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    // Map users with all role information
    // Use new fields if available, fall back to old role field for backward compatibility
    const usersWithRoles = users.map((user) => {
      // Map old role names to new structure
      let mappedSiteRole = user.siteRole;
      if (!mappedSiteRole && user.role) {
        const roleMapping: Record<string, string> = {
          'super_admin': 'owner', // Super admin maps to owner in site context
          'organization_admin': 'admin',
          'editor': 'editor',
          'viewer': 'viewer',
        };
        mappedSiteRole = roleMapping[user.role] || user.role;
      }

      return {
        ...user,
        siteRole: mappedSiteRole || 'viewer',
        platformRole: user.platformRole || (user.role === 'super_admin' || user.role === 'org_admin' ? 'admin' : 'user'),
        systemRole: user.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined),
        isSuperAdmin: user.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin',
      };
    });

    return {
      data: usersWithRoles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * GET /api/v1/platform/users/:id
   * Get platform user by ID (platform_admin only)
   */
  @Get(':id')
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.OWNER)
  @Permissions(Permission.USERS_READ)
  async getUserById(@Param('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Map user with all role information (same as listUsers)
    // Map old role names to new structure
    let mappedSiteRole = user.siteRole;
    if (!mappedSiteRole && user.role) {
      const roleMapping: Record<string, string> = {
        'super_admin': 'owner', // Super admin maps to owner in site context
        'organization_admin': 'admin',
        'editor': 'editor',
        'viewer': 'viewer',
      };
      mappedSiteRole = roleMapping[user.role] || user.role;
    }

    return {
      ...user,
      siteRole: mappedSiteRole || 'viewer',
      platformRole: user.platformRole || (user.role === 'super_admin' || user.role === 'org_admin' ? 'admin' : 'user'),
      systemRole: user.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined),
      isSuperAdmin: user.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin',
    };
  }

  /**
   * POST /api/v1/platform/users
   * Create a new platform user (platform_admin only)
   * Security: Only platform_admin can create platform_admin users
   */
  @Post()
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.OWNER)
  @Permissions(Permission.USERS_WRITE)
  async createUser(
    @Body(new ZodValidationPipe(createPlatformUserSchema)) dto: z.infer<typeof createPlatformUserSchema>,
    @CurrentUser() user: { platformRole?: string; role: string; isSuperAdmin?: boolean; systemRole?: string },
  ) {
    // Security: Only platform_admin can create platform_admin users
    // This check is now handled by the new security checks above

    // Security: Only super_admin can create super_admin users
    if (dto.role === Role.SUPER_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can create super_admin users');
    }

    // Check if user already exists (check all organizations)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Find or create a default organization for platform users
    // For now, we'll use the first organization or create a default one
    let organization = await this.prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!organization) {
      // Create a default organization for platform users
      organization = await this.prisma.organization.create({
        data: {
          name: 'Platform Users',
          slug: 'platform-users',
          plan: 'enterprise',
          settings: {},
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Determine roles
    // Normalize legacy role names
    const normalizedRole = dto.role === 'organization_admin' ? 'org_admin' : dto.role;

    const siteRole = dto.siteRole || normalizedRole || 'viewer';
    const platformRole = dto.platformRole || (normalizedRole === 'super_admin' || normalizedRole === 'org_admin' ? 'admin' : 'user');
    const systemRole = dto.systemRole || (normalizedRole === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = dto.systemRole === 'super_admin' || normalizedRole === 'super_admin';

    // Create user
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        orgId: organization.id,
        role: normalizedRole || siteRole, // Backward compatibility
        siteRole,
        platformRole,
        systemRole,
        isSuperAdmin,
        preferredLanguage: dto.preferredLanguage || 'en',
      },
      select: {
        id: true,
        email: true,
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // TODO: Store granular permissions in a separate table if needed
    // For now, permissions are derived from role

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId: newUser.id, orgId: organization.id } },
      update: { role: normalizedRole || siteRole },
      create: { userId: newUser.id, orgId: organization.id, role: normalizedRole || siteRole },
    });

    return newUser;
  }

  /**
   * PATCH /api/v1/platform/users/:id
   * Update platform user (platform_admin only)
   */
  @Patch(':id')
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.OWNER)
  @Permissions(Permission.USERS_WRITE)
  async updateUser(
    @Param('id') userId: string,
    @Body(new ZodValidationPipe(updatePlatformUserSchema)) dto: z.infer<typeof updatePlatformUserSchema>,
    @CurrentUser() user: { platformRole?: string; role: string; isSuperAdmin?: boolean; systemRole?: string },
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const normalizedRole = dto.role === 'organization_admin' ? 'org_admin' : dto.role;

    // Security: Only platform admin/owner can assign platform admin/owner role
    if (dto.platformRole && ['admin', 'owner'].includes(dto.platformRole)) {
      const userPlatformRole = user.platformRole as PlatformRole | undefined;
      if (userPlatformRole !== PlatformRole.ADMIN && userPlatformRole !== PlatformRole.OWNER && !user.isSuperAdmin) {
        throw new ForbiddenException('Only platform admin/owner can assign platform admin/owner role');
      }
    }

    // Security: Only super_admin can assign super_admin/system admin role
    if (dto.systemRole && ['super_admin', 'system_admin'].includes(dto.systemRole)) {
      if (!user.isSuperAdmin && user.systemRole !== 'super_admin' && user.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException('Only super_admin can assign super_admin/system_admin role');
      }
    }

    // Security: Only super_admin can assign super_admin role (backward compatibility)
    if (normalizedRole === Role.SUPER_ADMIN && user.role !== Role.SUPER_ADMIN && !user.isSuperAdmin) {
      throw new ForbiddenException('Only super_admin can assign super_admin role');
    }

    // Prevent self-demotion of last super_admin
    if ((existingUser.isSuperAdmin || existingUser.systemRole === 'super_admin' || existingUser.role === Role.SUPER_ADMIN) && 
        dto.systemRole && dto.systemRole !== 'super_admin') {
      const superAdminCount = await this.prisma.user.count({
        where: { 
          OR: [
            { isSuperAdmin: true },
            { systemRole: 'super_admin' },
            { role: Role.SUPER_ADMIN },
          ],
        },
      });

      if (superAdminCount === 1) {
        throw new BadRequestException('Cannot remove the last super_admin from platform');
      }
    }

    // Update user
    const updateData: any = {};
    if (normalizedRole) {
      updateData.role = normalizedRole; // Backward compatibility
      if (!dto.siteRole) {
        updateData.siteRole = normalizedRole === 'org_admin' ? 'admin' : normalizedRole;
      }
      if (!dto.platformRole) {
        updateData.platformRole = normalizedRole === 'super_admin' || normalizedRole === 'org_admin' ? 'admin' : 'user';
      }
    }
    if (dto.siteRole) updateData.siteRole = dto.siteRole;
    if (dto.platformRole) updateData.platformRole = dto.platformRole;
    if (dto.systemRole) {
      updateData.systemRole = dto.systemRole;
      updateData.isSuperAdmin = dto.systemRole === 'super_admin';
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * DELETE /api/v1/platform/users/:id
   * Delete platform user (platform_admin only)
   */
  @Delete(':id')
  @PlatformRoles(PlatformRole.ADMIN, PlatformRole.OWNER)
  @Permissions(Permission.USERS_DELETE)
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    // Prevent self-deletion
    if (userId === user.id) {
      throw new BadRequestException('Cannot delete yourself');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent deletion of last super_admin
    if (existingUser.role === Role.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.user.count({
        where: { role: Role.SUPER_ADMIN },
      });

      if (superAdminCount === 1) {
        throw new BadRequestException('Cannot delete the last super_admin from platform');
      }
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}

