import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/roles.enum';

export interface CreateMembershipDto {
  userId: string;
  tenantId: string;
  role: string;
}

export interface UpdateMembershipDto {
  role?: string;
}

@Injectable()
export class UserTenantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new membership (user-tenant relationship)
   */
  async createMembership(dto: CreateMembershipDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if membership already exists
    const existing = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: dto.userId, tenantId: dto.tenantId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    // Create membership
    return this.prisma.userTenant.create({
      data: {
        userId: dto.userId,
        tenantId: dto.tenantId,
        role: dto.role || Role.VIEWER,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string) {
    return this.prisma.userTenant.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all memberships for a tenant
   */
  async getTenantMemberships(tenantId: string) {
    return this.prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific membership
   */
  async getMembership(userId: string, tenantId: string) {
    const membership = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  /**
   * Update a membership (e.g., change role)
   */
  async updateMembership(userId: string, tenantId: string, dto: UpdateMembershipDto) {
    const membership = await this.getMembership(userId, tenantId);

    return this.prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: {
        role: dto.role || membership.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Remove a membership (user leaves tenant)
   */
  async removeMembership(userId: string, tenantId: string) {
    const membership = await this.getMembership(userId, tenantId);

    await this.prisma.userTenant.delete({
      where: { userId_tenantId: { userId, tenantId } },
    });

    return { success: true, deleted: membership };
  }

  /**
   * Check if user is a member of tenant
   */
  async isMember(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { id: true },
    });
    return !!membership;
  }

  /**
   * Get user's role in a tenant
   */
  async getUserRoleInTenant(userId: string, tenantId: string): Promise<string | null> {
    const membership = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { role: true },
    });
    return membership?.role || null;
  }
}

