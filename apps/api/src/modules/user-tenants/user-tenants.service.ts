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
    const membership = await this.prisma.userTenant.create({
      data: {
        userId: dto.userId,
        tenantId: dto.tenantId,
        role: dto.role || Role.VIEWER,
      },
    });
    
    // Fetch related data separately since UserTenant doesn't have relations
    const [userData, tenantData] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true, email: true } }),
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId }, select: { id: true, name: true, slug: true } }),
    ]);
    
    return { ...membership, user: userData, tenant: tenantData };
  }

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string) {
    const memberships = await this.prisma.userTenant.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    // Fetch tenant data separately
    const tenantIds = memberships.map(m => m.tenantId);
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true, plan: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t]));
    
    return memberships.map(m => ({ ...m, tenant: tenantMap.get(m.tenantId) || null }));
  }

  /**
   * Get all memberships for a tenant
   */
  async getTenantMemberships(tenantId: string) {
    const memberships = await this.prisma.userTenant.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    
    // Fetch user data separately
    const userIds = memberships.map(m => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, createdAt: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return memberships.map(m => ({ ...m, user: userMap.get(m.userId) || null }));
  }

  /**
   * Get a specific membership
   */
  async getMembership(userId: string, tenantId: string) {
    const membership = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    
    // Fetch related data separately
    const [userData, tenantData] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true } }),
    ]);
    
    return { ...membership, user: userData, tenant: tenantData };
  }

  /**
   * Update a membership (e.g., change role)
   */
  async updateMembership(userId: string, tenantId: string, dto: UpdateMembershipDto) {
    const membership = await this.getMembership(userId, tenantId);

    const updated = await this.prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: {
        role: dto.role || membership.role,
      },
    });
    
    // Fetch related data separately
    const [userData, tenantData] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true } }),
    ]);
    
    return { ...updated, user: userData, tenant: tenantData };
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

