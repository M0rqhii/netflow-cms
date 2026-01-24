import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * Database helper utilities for test isolation and cleanup
 */
export class DatabaseHelper {
  constructor(private prisma: PrismaService) {}

  /**
   * Truncate all tables (for test isolation)
   * Note: This should only be used in test environments
   */
  async truncateAll() {
    // Delete in correct order to respect foreign key constraints
    await this.prisma.userInvite.deleteMany({});
    await this.prisma.contentEntry.deleteMany({});
    await this.prisma.collection.deleteMany({});
    await this.prisma.contentType.deleteMany({});
    await this.prisma.site.deleteMany({});
    await this.prisma.user.deleteMany({});
    await this.prisma.organization.deleteMany({});
  }

  /**
   * Clean up specific site data
   */
  async cleanupSite(siteId: string) {
    await this.prisma.site.delete({
      where: { id: siteId },
    });
  }

  /**
   * Clean up specific organization data
   */
  async cleanupOrganization(orgId: string) {
    await this.prisma.organization.delete({
      where: { id: orgId },
    });
  }

  /**
   * Clean up multiple sites
   */
  async cleanupSites(siteIds: string[]) {
    await this.prisma.site.deleteMany({
      where: { id: { in: siteIds } },
    });
  }

  /**
   * Clean up multiple organizations
   */
  async cleanupOrganizations(orgIds: string[]) {
    await this.prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
  }

  /**
   * Check if database is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a raw query (useful for test setup/teardown)
   */
  async executeRaw<T = any>(query: string): Promise<T> {
    return this.prisma.$queryRawUnsafe(query);
  }
}
