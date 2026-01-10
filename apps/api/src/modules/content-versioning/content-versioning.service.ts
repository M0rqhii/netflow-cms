import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
// Using simple diff implementation - install 'diff' package for production: npm install diff @types/diff

/**
 * Content Versioning Service
 * AI Note: Manages version history, diff, and restoration for collection items
 */
@Injectable()
export class ContentVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a version snapshot when item is updated
   */
  async createVersion(
    siteId: string,
    itemId: string,
    data: any,
    status: string,
    changedBy?: string,
    changeNote?: string,
  ) {
    // Get current item to determine next version number
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        id: itemId,
        siteId,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    // Create version snapshot
    return this.prisma.collectionItemVersion.create({
      data: {
        siteId,
        itemId,
        version: item.version,
        data,
        status: status as any,
        changedBy,
        changeNote,
      },
    });
  }

  /**
   * Get version history for an item
   */
  async getVersionHistory(siteId: string, itemId: string) {
    // Verify item exists
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        id: itemId,
        siteId,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    // Get all versions ordered by version number (descending)
    const versions = await this.prisma.collectionItemVersion.findMany({
      where: {
        siteId,
        itemId,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return {
      currentVersion: item.version,
      versions,
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(siteId: string, itemId: string, version: number) {
    const versionRecord = await this.prisma.collectionItemVersion.findFirst({
      where: {
        siteId,
        itemId,
        version,
      },
    });

    if (!versionRecord) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    return versionRecord;
  }

  /**
   * Get diff between two versions
   */
  async getVersionDiff(
    siteId: string,
    itemId: string,
    version1: number,
    version2: number,
  ) {
    const [v1, v2] = await Promise.all([
      this.getVersion(siteId, itemId, version1),
      this.getVersion(siteId, itemId, version2),
    ]);

    // Convert JSON to string for diff
    const v1Str = JSON.stringify(v1.data, null, 2);
    const v2Str = JSON.stringify(v2.data, null, 2);

    // Generate diff (simple line-by-line comparison)
    const changes = this.diffLines(v1Str, v2Str);

    return {
      version1: {
        version: v1.version,
        createdAt: v1.createdAt,
        changedBy: v1.changedBy,
        changeNote: v1.changeNote,
      },
      version2: {
        version: v2.version,
        createdAt: v2.createdAt,
        changedBy: v2.changedBy,
        changeNote: v2.changeNote,
      },
      diff: changes.map((part) => ({
        added: part.added || false,
        removed: part.removed || false,
        value: part.value,
      })),
      // Also provide structured diff for programmatic use
      structuredDiff: this.getStructuredDiff(v1.data, v2.data),
    };
  }

  /**
   * Restore a version (creates new version with restored data)
   */
  async restoreVersion(
    siteId: string,
    itemId: string,
    version: number,
    userId?: string,
    changeNote?: string,
  ) {
    const versionRecord = await this.getVersion(siteId, itemId, version);

    // Get current item
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        id: itemId,
        siteId,
      },
    });

    if (!item) {
      throw new NotFoundException('Collection item not found');
    }

    // Update item with restored data
    const updated = await this.prisma.collectionItem.update({
      where: { id: itemId },
      data: {
        data: versionRecord.data as any, // JsonValue type compatibility
        status: versionRecord.status,
        version: item.version + 1,
        updatedById: userId,
      },
    });

    // Create new version snapshot for the restoration
    await this.createVersion(
      siteId,
      itemId,
      versionRecord.data,
      versionRecord.status,
      userId,
      changeNote || `Restored from version ${version}`,
    );

    return updated;
  }

  /**
   * Get structured diff between two objects
   */
  private getStructuredDiff(obj1: any, obj2: any): any {
    const diff: any = {
      added: {},
      removed: {},
      changed: {},
      unchanged: {},
    };

    const allKeys = new Set([
      ...Object.keys(obj1 || {}),
      ...Object.keys(obj2 || {}),
    ]);

    for (const key of allKeys) {
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (!(key in (obj1 || {}))) {
        diff.added[key] = val2;
      } else if (!(key in (obj2 || {}))) {
        diff.removed[key] = val1;
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diff.changed[key] = {
          old: val1,
          new: val2,
        };
      } else {
        diff.unchanged[key] = val1;
      }
    }

    return diff;
  }

  /**
   * Simple line-by-line diff implementation
   * AI Note: For production, use 'diff' package: npm install diff @types/diff
   */
  private diffLines(oldStr: string, newStr: string): Array<{ added?: boolean; removed?: boolean; value: string }> {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const result: Array<{ added?: boolean; removed?: boolean; value: string }> = [];
    
    let i = 0;
    let j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i >= oldLines.length) {
        result.push({ added: true, value: newLines[j] + '\n' });
        j++;
      } else if (j >= newLines.length) {
        result.push({ removed: true, value: oldLines[i] + '\n' });
        i++;
      } else if (oldLines[i] === newLines[j]) {
        result.push({ value: oldLines[i] + '\n' });
        i++;
        j++;
      } else {
        // Check if line was moved
        const nextOldIndex = oldLines.slice(i + 1).indexOf(newLines[j]);
        const nextNewIndex = newLines.slice(j + 1).indexOf(oldLines[i]);
        
        if (nextOldIndex >= 0 && (nextNewIndex < 0 || nextOldIndex < nextNewIndex)) {
          result.push({ removed: true, value: oldLines[i] + '\n' });
          i++;
        } else if (nextNewIndex >= 0) {
          result.push({ added: true, value: newLines[j] + '\n' });
          j++;
        } else {
          result.push({ removed: true, value: oldLines[i] + '\n' });
          result.push({ added: true, value: newLines[j] + '\n' });
          i++;
          j++;
        }
      }
    }
    
    return result;
  }
}

