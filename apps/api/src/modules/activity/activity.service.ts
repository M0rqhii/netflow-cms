import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * ActivityService - provides activity feed for the platform
 * AI Note: Returns recent activity events (for MVP, returns sample data)
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get activity feed
   * Returns recent activity events
   * 
   * Note: For MVP, this returns sample data based on recent database changes.
   * In production, this should query from a dedicated audit_log table.
   */
  async getActivity(limit: number = 10) {
    try {
      // For MVP, return sample activity based on recent database changes
      // In production, this should query from audit_log table
      
      const activities: Array<{
        id: string;
        type?: string;
        message: string;
        description?: string;
        createdAt: string;
      }> = [];

      // Get recent tenants
      const recentTenants = await this.prisma.tenant.findMany({
        take: Math.min(limit, 5),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });

      recentTenants.forEach((tenant) => {
        activities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant.created',
          message: `Tenant "${tenant.name}" was created`,
          description: `New tenant added to the platform`,
          createdAt: tenant.createdAt.toISOString(),
        });
      });

      // Get recent users
      const recentUsers = await this.prisma.user.findMany({
        take: Math.min(limit, 5),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user.created',
          message: `User "${user.email}" was created`,
          description: `New user added to the platform`,
          createdAt: user.createdAt.toISOString(),
        });
      });

      // Get recent collections
      const recentCollections = await this.prisma.collection.findMany({
        take: Math.min(limit, 5),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });

      recentCollections.forEach((collection) => {
        activities.push({
          id: `collection-${collection.id}`,
          type: 'collection.created',
          message: `Collection "${collection.name}" was created`,
          description: `New collection added`,
          createdAt: collection.createdAt.toISOString(),
        });
      });

      // Sort by createdAt descending and limit
      activities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return activities.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to fetch activity', error instanceof Error ? error.stack : String(error));
      // Return empty array on error instead of throwing
      return [];
    }
  }
}

