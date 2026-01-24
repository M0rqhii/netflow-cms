import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * StatsService - provides statistics for the platform
 * AI Note: Returns aggregated counts for organizations, collections, media, and users
 */
@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get quick statistics for the platform
   * Returns counts of organizations, collections, media files, and users
   */
  async getQuickStats() {
    try {
      const [organizations, collections, media, users] = await Promise.all([
        this.prisma.organization.count(),
        this.prisma.collection.count(),
        this.prisma.mediaItem.count(),
        this.prisma.user.count(),
      ]);

      // Count active organizations (organizations with at least one user)
      const activeOrganizations = await this.prisma.organization.count({
        where: {
          users: {
            some: {},
          },
        },
      });

      return {
        organizations,
        collections,
        media,
        users,
        active: activeOrganizations,
        total: organizations,
      };
    } catch (error) {
      this.logger.error('Failed to fetch quick stats', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  /**
   * Get organization-specific statistics
   * Returns counts of collections and media files for an organization
   */
  async getOrgStats(orgId: string) {
    try {
      const [collections, media] = await Promise.all([
        this.prisma.collection.count({ where: { site: { orgId } } }),
        this.prisma.mediaItem.count({ where: { site: { orgId } } }),
      ]);

      return {
        collections,
        media,
      };
    } catch (error) {
      this.logger.error('Failed to fetch organization stats', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
}








