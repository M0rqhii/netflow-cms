import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/roles.enum';
import * as bcrypt from 'bcrypt';

/**
 * UsersService - business logic for user management
 * AI Note: Handles user operations with proper authorization checks
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current user information
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }

  /**
   * List users in a tenant (only for admins)
   */
  async listUsers(tenantId: string, requestingUserRole: string) {
    // Only tenant_admin and super_admin can list users
    if (
      requestingUserRole !== Role.TENANT_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to list users');
    }

    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Get user by ID (only for admins)
   */
  async getUserById(userId: string, tenantId: string, requestingUserRole: string) {
    // Only tenant_admin and super_admin can view user details
    if (
      requestingUserRole !== Role.TENANT_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to view user');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // Ensure user belongs to the same tenant
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user preferences (language, etc.)
   */
  async updatePreferences(userId: string, preferences: { preferredLanguage?: 'pl' | 'en' }) {
    const updateData: { preferredLanguage?: string } = {};
    
    if (preferences.preferredLanguage !== undefined) {
      updateData.preferredLanguage = preferences.preferredLanguage;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }

  /**
   * Create a new user (admin only)
   * Security: Only super_admin can create super_admin users
   */
  async createUser(
    tenantId: string,
    dto: { email: string; password: string; role: string; preferredLanguage?: 'pl' | 'en' },
    requestingUserRole: string,
  ) {
    // Only tenant_admin and super_admin can create users
    if (
      requestingUserRole !== Role.TENANT_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    // Security: Only super_admin can create super_admin users
    if (dto.role === Role.SUPER_ADMIN && requestingUserRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can create super_admin users');
    }

    // Validate role
    const validRoles = [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.EDITOR, Role.VIEWER];
    if (!validRoles.includes(dto.role as Role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: dto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        tenantId,
        role: dto.role,
        preferredLanguage: dto.preferredLanguage || 'en',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Update user role (admin only)
   * Security: Only super_admin can assign super_admin role
   */
  async updateUserRole(
    userId: string,
    tenantId: string,
    newRole: string,
    requestingUserRole: string,
  ) {
    // Only tenant_admin and super_admin can update user roles
    if (
      requestingUserRole !== Role.TENANT_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to update user roles');
    }

    // Security: Only super_admin can assign super_admin role
    if (newRole === Role.SUPER_ADMIN && requestingUserRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can assign super_admin role');
    }

    // Validate role
    const validRoles = [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.EDITOR, Role.VIEWER];
    if (!validRoles.includes(newRole as Role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-demotion of last super_admin (optional safety check)
    if (user.role === Role.SUPER_ADMIN && newRole !== Role.SUPER_ADMIN) {
      // Check if this is the last super_admin in the tenant
      const superAdminCount = await this.prisma.user.count({
        where: {
          tenantId,
          role: Role.SUPER_ADMIN,
        },
      });

      if (superAdminCount === 1) {
        throw new BadRequestException('Cannot remove the last super_admin from tenant');
      }
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}


