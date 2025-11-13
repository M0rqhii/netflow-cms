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
    await this.prisma.contentEntry.deleteMany({});
    await this.prisma.collection.deleteMany({});
    await this.prisma.contentType.deleteMany({});
    await this.prisma.user.deleteMany({});
    await this.prisma.tenant.deleteMany({});
  }

  /**
   * Clean up specific tenant data
   */
  async cleanupTenant(tenantId: string) {
    await this.prisma.contentEntry.deleteMany({
      where: { tenantId },
    });
    await this.prisma.collection.deleteMany({
      where: { tenantId },
    });
    await this.prisma.contentType.deleteMany({
      where: { tenantId },
    });
    await this.prisma.user.deleteMany({
      where: { tenantId },
    });
    await this.prisma.tenant.delete({
      where: { id: tenantId },
    });
  }

  /**
   * Clean up multiple tenants
   */
  async cleanupTenants(tenantIds: string[]) {
    await this.prisma.contentEntry.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.collection.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.contentType.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.user.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.tenant.deleteMany({
      where: { id: { in: tenantIds } },
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


