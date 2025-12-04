import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/roles.enum';

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

    return user;
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
}


