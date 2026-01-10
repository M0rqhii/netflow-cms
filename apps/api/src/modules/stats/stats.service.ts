import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * StatsService - provides statistics for the platform
 * AI Note: Returns aggregated counts for tenants, collections, media, and users
 */
@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get quick statistics for the platform
   * Returns counts of tenants, collections, media files, and users
   */
  async getQuickStats() {
    try {
      const [tenants, collections, media, users] = await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.collection.count(),
        this.prisma.mediaItem.count(),
        this.prisma.user.count(),
      ]);

      // Count active tenants (organizations with at least one user)
      const activeTenants = await this.prisma.organization.count({
        where: {
          users: {
            some: {},
          },
        },
      });

      return {
        tenants,
        collections,
        media,
        users,
        active: activeTenants,
        total: tenants,
      };
    } catch (error) {
      this.logger.error('Failed to fetch quick stats', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  /**
   * Get tenant-specific statistics
   * Returns counts of collections and media files for a tenant
   */
  async getTenantStats(tenantId: string) {
    try {
      const [collections, media] = await Promise.all([
        this.prisma.collection.count({ where: { siteId: tenantId } }),
        this.prisma.mediaItem.count({ where: { siteId: tenantId } }),
      ]);

      return {
        collections,
        media,
      };
    } catch (error) {
      this.logger.error('Failed to fetch tenant stats', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
}








