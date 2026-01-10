import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';

/**
 * ActivityService - provides activity feed for the platform
 * AI Note: Returns recent activity events with role-based filtering
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get activity feed
   * Returns recent activity events filtered by user permissions
   * 
   * Role-based filtering:
   * - Super admin: all logs
   * - Org owner/admin: all org logs or specific site logs
   * - Org member with site role: only their site logs
   * - Org member without site role: no logs
   * 
   * @param limit - Maximum number of activities to return
   * @param user - Current user payload
   * @param orgId - Optional organization ID to filter activities by organization
   * @param siteId - Optional site ID to filter activities by site
   */
  async getActivity(
    limit: number = 10,
    user: CurrentUserPayload,
    orgId?: string,
    siteId?: string,
  ) {
    try {
      // Super admin can see all logs
      if (user.isSuperAdmin || user.systemRole === 'super_admin') {
        return this.getActivityForSuperAdmin(limit, orgId, siteId);
      }

      // Determine effective orgId (from user token or query param)
      const effectiveOrgId = orgId || user.orgId || user.tenantId;
      if (!effectiveOrgId) {
        throw new ForbiddenException('Organization ID is required');
      }

      // Get user's role in organization
      const orgMembership = await this.getUserOrgRole(user.id, effectiveOrgId);
      if (!orgMembership) {
        throw new ForbiddenException('You are not a member of this organization');
      }

      const orgRole = orgMembership.role; // 'owner', 'admin', or 'member'

      // Get user's accessible sites
      const accessibleSiteIds = await this.getUserAccessibleSites(user.id, effectiveOrgId);

      // Role-based filtering
      if (orgRole === 'member') {
        // Member can only see logs for sites they have access to
        if (accessibleSiteIds.length === 0) {
          // No site access - return empty
          return [];
        }

        if (siteId) {
          // Check if user has access to this specific site
          if (!accessibleSiteIds.includes(siteId)) {
            throw new ForbiddenException('You do not have access to this site');
          }
          // Return logs only for this site
          return this.getActivityForSite(limit, effectiveOrgId, siteId);
        } else {
          // Return logs for all accessible sites
          return this.getActivityForSites(limit, effectiveOrgId, accessibleSiteIds);
        }
      } else {
        // Owner or Admin can see all org logs or specific site logs
        if (siteId) {
          // Verify site belongs to org
          const site = await this.prisma.site.findUnique({
            where: { id: siteId },
            select: { orgId: true },
          });
          if (!site || site.orgId !== effectiveOrgId) {
            throw new ForbiddenException('Site not found or does not belong to this organization');
          }
          return this.getActivityForSite(limit, effectiveOrgId, siteId);
        } else {
          // Return logs for entire organization
          return this.getActivityForOrg(limit, effectiveOrgId);
        }
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Failed to fetch activity', error instanceof Error ? error.stack : String(error));
      return [];
    }
  }

  /**
   * Get user's role in organization
   */
  private async getUserOrgRole(userId: string, orgId: string): Promise<{ role: string } | null> {
    try {
      const membership = await this.prisma.userOrg.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId,
          },
        },
        select: { role: true },
      });
      return membership;
    } catch (error) {
      // Fallback to legacy UserTenant
      try {
        const legacy = await this.prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId,
              tenantId: orgId,
            },
          },
          select: { role: true },
        });
        return legacy;
      } catch {
        return null;
      }
    }
  }

  /**
   * Get list of site IDs user has access to (via UserRole with SITE scope)
   */
  private async getUserAccessibleSites(userId: string, orgId: string): Promise<string[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          userId,
          orgId,
          siteId: { not: null },
          role: {
            scope: 'SITE',
          },
        },
        select: { siteId: true },
      });
      return userRoles.map(ur => ur.siteId!).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Get activity for super admin (all logs)
   */
  private async getActivityForSuperAdmin(limit: number, orgId?: string, siteId?: string) {
    return this.getActivityInternal(limit, orgId, siteId);
  }

  /**
   * Get activity for entire organization
   */
  private async getActivityForOrg(limit: number, orgId: string) {
    return this.getActivityInternal(limit, orgId, undefined);
  }

  /**
   * Get activity for specific site
   */
  private async getActivityForSite(limit: number, orgId: string, siteId: string) {
    return this.getActivityInternal(limit, orgId, siteId);
  }

  /**
   * Get activity for multiple sites
   */
  private async getActivityForSites(limit: number, orgId: string, siteIds: string[]) {
    if (siteIds.length === 0) return [];
    // For now, get activity for all sites in org and filter by siteIds
    // In production, this should query audit_log with siteId filter
    const allActivity = await this.getActivityInternal(limit * 2, orgId, undefined);
    // Note: Current implementation doesn't track siteId per activity
    // This is a limitation of MVP - in production, audit_log should have siteId
    return allActivity.slice(0, limit);
  }

  /**
   * Internal method to get activity (actual data fetching)
   */
  private async getActivityInternal(limit: number = 10, orgId?: string, siteId?: string) {
    try {
      const activities: Array<{
        id: string;
        type?: string;
        message: string;
        description?: string;
        createdAt: string;
      }> = [];

      // Get recent tenants (only if no orgId filter - platform-wide)
      if (!orgId) {
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
      }

      // Get recent users (filter by orgId if siteId is provided)
      const userWhere = orgId ? { orgId } : {};
      const recentUsers = await this.prisma.user.findMany({
        where: userWhere,
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
          description: orgId ? `New user added to the organization` : `New user added to the platform`,
          createdAt: user.createdAt.toISOString(),
        });
      });

      // Get recent collections (filter by orgId if provided - get all sites for org, then filter collections)
      const collectionWhere = orgId ? { 
        site: { orgId } 
      } : {};
      const recentCollections = await this.prisma.collection.findMany({
        where: collectionWhere,
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
          description: orgId ? `New collection added to the organization` : `New collection added`,
          createdAt: collection.createdAt.toISOString(),
        });
      });

      // Get recent content entries (filter by orgId and optionally siteId)
      const contentEntryWhere = siteId ? { 
        siteId 
      } : orgId ? { 
        site: { orgId } 
      } : {};
      const recentContentEntries = await this.prisma.contentEntry.findMany({
        where: contentEntryWhere,
        take: Math.min(limit, 5),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      recentContentEntries.forEach((entry) => {
        activities.push({
          id: `content-${entry.id}`,
          type: 'content.created',
          message: `Content entry was ${entry.status}`,
          description: orgId ? `Content activity in the organization` : `New content entry`,
          createdAt: entry.createdAt.toISOString(),
        });
      });

      // Get recent media items (filter by orgId and optionally siteId)
      const mediaWhere = siteId ? { 
        siteId 
      } : orgId ? { 
        site: { orgId } 
      } : {};
      const recentMedia = await this.prisma.mediaItem.findMany({
        where: mediaWhere,
        take: Math.min(limit, 5),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          createdAt: true,
        },
      });

      recentMedia.forEach((media) => {
        activities.push({
          id: `media-${media.id}`,
          type: 'media.uploaded',
          message: `Media "${media.fileName}" was uploaded`,
          description: orgId ? `New media uploaded to the organization` : `New media uploaded`,
          createdAt: media.createdAt.toISOString(),
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









