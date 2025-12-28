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

      // Count active tenants (tenants with at least one user)
      const activeTenants = await this.prisma.tenant.count({
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
}





