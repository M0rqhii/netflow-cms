import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CAPABILITY_REGISTRY } from '@repo/schemas';

/**
 * Capability Sync Service
 * 
 * Syncs capabilities from the registry to the database.
 * Should be run on startup or via a migration/seeding script.
 */
@Injectable()
export class CapabilitySyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sync all capabilities from registry to database
   */
  async syncCapabilities(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const capDef of CAPABILITY_REGISTRY) {
      const existing = await this.prisma.capability.findUnique({
        where: { key: capDef.key },
      });

      if (existing) {
        // Update existing capability
        await this.prisma.capability.update({
          where: { key: capDef.key },
          data: {
            module: capDef.module,
            label: capDef.label,
            description: capDef.description,
            riskLevel: capDef.riskLevel,
            isDangerous: capDef.isDangerous,
          },
        });
        updated++;
      } else {
        // Create new capability
        await this.prisma.capability.create({
          data: {
            key: capDef.key,
            module: capDef.module,
            label: capDef.label,
            description: capDef.description,
            riskLevel: capDef.riskLevel,
            isDangerous: capDef.isDangerous,
          },
        });
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Remove capabilities from database that are not in registry
   */
  async removeOrphanedCapabilities(): Promise<number> {
    const registryKeys = new Set(CAPABILITY_REGISTRY.map(c => c.key));
    const dbCapabilities = await this.prisma.capability.findMany({
      select: { key: true },
    });

    const orphaned = dbCapabilities.filter(c => !registryKeys.has(c.key));
    let removed = 0;

    for (const orphan of orphaned) {
      // Check if capability is used in any roles
      const used = await this.prisma.roleCapability.findFirst({
        where: {
          capability: {
            key: orphan.key,
          },
        },
      });

      if (!used) {
        await this.prisma.capability.delete({
          where: { key: orphan.key },
        });
        removed++;
      }
    }

    return removed;
  }
}

