import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';
import { CreateCollectionRoleDto, UpdateCollectionRoleDto } from './dto';

/**
 * Collection Roles Service
 * AI Note: Manages per-collection RBAC roles
 */
@Injectable()
export class CollectionRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaOptimization: PrismaOptimizationService,
  ) {}

  /**
   * Assign role to user for a collection
   */
  async assignRole(
    siteId: string,
    collectionId: string,
    dto: CreateCollectionRoleDto,
  ) {
    // Verify collection exists
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        siteId,
      },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Verify user exists (user belongs to org, not directly to site)
    const user = await this.prisma.user.findUnique({
      where: {
        id: dto.userId,
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role already exists
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const existing = await (this.prisma as any).collectionRole.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Role already assigned to user for this collection');
    }

    // Determine role from permissions if not provided (backward compatibility)
    let role = dto.role;
    if (!role) {
      // Auto-determine role based on permissions
      if (dto.canDelete) {
        role = 'admin';
      } else if (dto.canPublish || dto.canWrite) {
        role = 'editor';
      } else {
        role = 'viewer';
      }
    }

    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    return (this.prisma as any).collectionRole.create({
      data: {
        siteId,
        collectionId,
        userId: dto.userId,
        role: role || 'viewer',
        canRead: dto.canRead ?? true,
        canWrite: dto.canWrite ?? false,
        canPublish: dto.canPublish ?? false,
        canDelete: dto.canDelete ?? false,
      },
    });
  }

  /**
   * Update collection role
   */
  async updateRole(
    siteId: string,
    collectionId: string,
    userId: string,
    dto: UpdateCollectionRoleDto,
  ) {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const role = await (this.prisma as any).collectionRole.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (!role || role.siteId !== siteId) {
      throw new NotFoundException('Collection role not found');
    }

    // Update role if provided, otherwise keep existing
    const updateData: any = {};
    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }
    if (dto.canRead !== undefined) {
      updateData.canRead = dto.canRead;
    }
    if (dto.canWrite !== undefined) {
      updateData.canWrite = dto.canWrite;
    }
    if (dto.canPublish !== undefined) {
      updateData.canPublish = dto.canPublish;
    }
    if (dto.canDelete !== undefined) {
      updateData.canDelete = dto.canDelete;
    }

    return (this.prisma as any).collectionRole.update({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
      data: updateData,
    });
  }

  /**
   * Remove collection role
   */
  async removeRole(siteId: string, collectionId: string, userId: string) {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const role = await (this.prisma as any).collectionRole.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (!role || role.siteId !== siteId) {
      throw new NotFoundException('Collection role not found');
    }

    await (this.prisma as any).collectionRole.delete({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });
  }

  /**
   * Get roles for a collection
   */
  async getCollectionRoles(siteId: string, collectionId: string) {
    // Verify collection exists
    const collection = await this.prisma.collection.findFirst({
      where: {
        id: collectionId,
        siteId,
      },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.prismaOptimization.findManyOptimized(
      'collectionRole',
      {
        siteId,
        collectionId,
      },
      {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Get collections for a user
   */
  async getUserCollections(siteId: string, userId: string) {
    return this.prismaOptimization.findManyOptimized(
      'collectionRole',
      {
        siteId,
        userId,
      },
      {
        id: true,
        collectionId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Check if user has permission for collection (backward compatibility)
   */
  async hasCollectionPermission(
    siteId: string,
    collectionId: string,
    userId: string,
    requiredRole: 'viewer' | 'editor' | 'admin',
  ): Promise<boolean> {
    const role = await this.getCollectionRole(siteId, collectionId, userId);
    if (!role) {
      return false;
    }

    // Role hierarchy: admin > editor > viewer (backward compatibility)
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
    return roleHierarchy[role.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
  }

  /**
   * Get collection role with granular permissions
   */
  async getCollectionRole(
    siteId: string,
    collectionId: string,
    userId: string,
  ) {
    // Note: Prisma Client must be generated with: pnpm --filter api db:generate
    const role = await (this.prisma as any).collectionRole.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (!role || role.siteId !== siteId) {
      return null;
    }

    return role;
  }

  /**
   * Check granular permission for collection
   */
  async hasGranularPermission(
    siteId: string,
    collectionId: string,
    userId: string,
    permission: 'read' | 'write' | 'publish' | 'delete',
  ): Promise<boolean> {
    const role = await this.getCollectionRole(siteId, collectionId, userId);
    if (!role) {
      return false;
    }

    // Check granular permissions
    switch (permission) {
      case 'read':
        return role.canRead === true;
      case 'write':
        return role.canWrite === true;
      case 'publish':
        return role.canPublish === true;
      case 'delete':
        return role.canDelete === true;
      default:
        return false;
    }
  }
}

