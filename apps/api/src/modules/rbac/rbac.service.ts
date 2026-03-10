import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CAPABILITY_REGISTRY,
  getCapabilityByKey,
  isCapabilityBlocked,
  coercePublicRbacUserRoleKey,
  getPublicRbacUserRole,
  type CapabilityDefinition,
} from '@repo/schemas';
import { CreateRoleDto, UpdateRoleDto, CreateAssignmentDto, UpdatePolicyDto } from './dto';
import { getPlatformAccessProfile } from '../../common/auth/platform-admin.util';
import { buildSystemRoleDefinitions, type SystemRoleDefinition } from './system-role-definitions';

type TenantRoleScope = 'ORG' | 'SITE';
@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  private isPlatformCapabilityKey(capabilityKey: string): boolean {
    return capabilityKey.startsWith('platform.');
  }

  private getSystemDefinitions(allCapabilityKeys: string[]) {
    return buildSystemRoleDefinitions(allCapabilityKeys);
  }

  private haveSameKeys(currentKeys: Iterable<string>, expectedKeys: Iterable<string>) {
    const current = new Set(currentKeys);
    const expected = new Set(expectedKeys);
    if (current.size !== expected.size) {
      return false;
    }
    for (const key of expected) {
      if (!current.has(key)) {
        return false;
      }
    }
    return true;
  }

  private async getCapabilityMap() {
    const capabilities = await this.prisma.capability.findMany({
      select: { id: true, key: true },
    });

    return {
      capabilities,
      capMap: new Map(capabilities.map((cap) => [cap.key, cap.id])),
      allCapabilityKeys: capabilities.map((cap) => cap.key),
    };
  }

  private async syncTenantSystemRole(orgId: string, roleDef: SystemRoleDefinition, capMap: Map<string, string>) {
    const role = await this.prisma.role.upsert({
      where: {
        orgId_name_scope: {
          orgId,
          name: roleDef.name,
          scope: roleDef.scope,
        },
      },
      update: {
        description: roleDef.description,
        type: 'SYSTEM',
        isImmutable: true,
      },
      create: {
        orgId,
        name: roleDef.name,
        description: roleDef.description,
        type: 'SYSTEM',
        scope: roleDef.scope,
        isImmutable: true,
      },
    });

    const capabilityIds = roleDef.capabilityKeys
      .map((key) => capMap.get(key))
      .filter((id): id is string => Boolean(id));

    await this.prisma.roleCapability.deleteMany({ where: { roleId: role.id } });
    if (capabilityIds.length > 0) {
      await this.prisma.roleCapability.createMany({
        data: capabilityIds.map((capabilityId) => ({
          roleId: role.id,
          capabilityId,
        })),
      });
    }
  }

  private async syncPlatformSystemRole(roleDef: SystemRoleDefinition, capMap: Map<string, string>) {
    const role = await this.prisma.platformRole.upsert({
      where: {
        name: roleDef.name,
      },
      update: {
        description: roleDef.description,
        type: 'SYSTEM',
        isImmutable: true,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        type: 'SYSTEM',
        isImmutable: true,
      },
    });

    const capabilityIds = roleDef.capabilityKeys
      .map((key) => capMap.get(key))
      .filter((id): id is string => Boolean(id));

    await this.prisma.platformRoleCapability.deleteMany({ where: { roleId: role.id } });
    if (capabilityIds.length > 0) {
      await this.prisma.platformRoleCapability.createMany({
        data: capabilityIds.map((capabilityId) => ({
          roleId: role.id,
          capabilityId,
        })),
      });
    }
  }

  private async ensureSystemRoles(orgId: string) {
    const existingSystemRoles = await this.prisma.role.findMany({
      where: { orgId, type: 'SYSTEM' },
      select: {
        name: true,
        scope: true,
        description: true,
        type: true,
        isImmutable: true,
        roleCapabilities: {
          select: {
            capability: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });
    const { capMap, allCapabilityKeys } = await this.getCapabilityMap();
    const roleDefinitions = this.getSystemDefinitions(allCapabilityKeys).filter(
      (roleDef): roleDef is SystemRoleDefinition & { scope: TenantRoleScope } =>
        roleDef.scope === 'ORG' || roleDef.scope === 'SITE',
    );
    const existingByKey = new Map(
      existingSystemRoles.map((role) => [`${role.name}:${role.scope}`, role]),
    );

    for (const roleDef of roleDefinitions) {
      const existing = existingByKey.get(`${roleDef.name}:${roleDef.scope}`);
      const expectedCapabilityKeys = roleDef.capabilityKeys.filter((key) => capMap.has(key));
      const currentCapabilityKeys = existing?.roleCapabilities.map((item) => item.capability.key) ?? [];
      const needsSync =
        !existing ||
        existing.description !== roleDef.description ||
        existing.type !== 'SYSTEM' ||
        existing.isImmutable !== true ||
        !this.haveSameKeys(currentCapabilityKeys, expectedCapabilityKeys);

      if (needsSync) {
        await this.syncTenantSystemRole(orgId, roleDef, capMap);
      }
    }
  }

  private async ensurePlatformRoles() {
    const existingSystemRoles = await this.prisma.platformRole.findMany({
      where: { type: 'SYSTEM' },
      select: {
        name: true,
        description: true,
        type: true,
        isImmutable: true,
        roleCapabilities: {
          select: {
            capability: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });
    const { capMap, allCapabilityKeys } = await this.getCapabilityMap();
    const roleDefinitions = this.getSystemDefinitions(allCapabilityKeys).filter(
      (roleDef) => roleDef.scope === 'PLATFORM',
    );
    const existingByName = new Map(existingSystemRoles.map((role) => [role.name, role]));

    for (const roleDef of roleDefinitions) {
      const existing = existingByName.get(roleDef.name);
      const expectedCapabilityKeys = roleDef.capabilityKeys.filter((key) => capMap.has(key));
      const currentCapabilityKeys = existing?.roleCapabilities.map((item) => item.capability.key) ?? [];
      const needsSync =
        !existing ||
        existing.description !== roleDef.description ||
        existing.type !== 'SYSTEM' ||
        existing.isImmutable !== true ||
        !this.haveSameKeys(currentCapabilityKeys, expectedCapabilityKeys);

      if (needsSync) {
        await this.syncPlatformSystemRole(roleDef, capMap);
      }
    }
  }

  /**
   * Get all capabilities with policy status
   */
  async getCapabilities(orgId: string) {
    // Get all policies for this org
    const policies = await this.prisma.orgPolicy.findMany({
      where: { orgId },
    });

    const policyMap = new Map(
      policies.map(p => [p.capabilityKey, p.enabled])
    );

    // Return capabilities with policy status
    return CAPABILITY_REGISTRY.filter((cap) => !this.isPlatformCapabilityKey(cap.key)).map((cap: CapabilityDefinition) => ({
      key: cap.key,
      module: cap.module,
      label: cap.label,
      description: cap.description,
      riskLevel: cap.riskLevel,
      isDangerous: cap.isDangerous,
      canBePolicyControlled: cap.canBePolicyControlled,
      policyEnabled: policyMap.get(cap.key) ?? cap.defaultPolicyEnabled,
      metadata: {
        blockedForCustomRoles: cap.blockedForCustomRoles || false,
      },
    }));
  }

  async getPlatformCapabilities() {
    await this.ensurePlatformRoles();

    return CAPABILITY_REGISTRY.filter((cap) => this.isPlatformCapabilityKey(cap.key)).map((cap: CapabilityDefinition) => ({
      key: cap.key,
      module: cap.module,
      label: cap.label,
      description: cap.description,
      riskLevel: cap.riskLevel,
      isDangerous: cap.isDangerous,
      canBePolicyControlled: false,
      policyEnabled: true,
      metadata: {
        blockedForCustomRoles: cap.blockedForCustomRoles || false,
      },
    }));
  }

  /**
   * Get roles (system + custom) with optional scope filter
   */
  async getRoles(orgId: string, scope?: 'ORG' | 'SITE') {
    await this.ensureSystemRoles(orgId);
    const where: any = { orgId };
    if (scope) {
      where.scope = scope;
    }

    const roles = await this.prisma.role.findMany({
      where,
      include: {
        roleCapabilities: {
          include: {
            capability: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' }, // SYSTEM first, then CUSTOM
        { name: 'asc' },
      ],
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      scope: role.scope,
      isImmutable: role.isImmutable,
      capabilities: role.roleCapabilities.map((rc: any) => ({
        key: rc.capability.key,
        module: rc.capability.module,
        label: rc.capability.label,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async getPlatformRoles() {
    await this.ensurePlatformRoles();

    const roles = await this.prisma.platformRole.findMany({
      include: {
        roleCapabilities: {
          include: {
            capability: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      scope: 'PLATFORM' as const,
      isImmutable: role.isImmutable,
      capabilities: role.roleCapabilities.map((rc: any) => ({
        key: rc.capability.key,
        module: rc.capability.module,
        label: rc.capability.label,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  /**
   * Create custom role
   * 
   * Authorization:
   * - For ORG scope: requires org.roles.manage capability (Org level only)
   * - For SITE scope: requires builder.site_roles.manage capability (Site or Org level)
   * 
   * Site can only create SITE scope roles, NOT ORG scope roles
   */
  async createRole(orgId: string, dto: CreateRoleDto, _actorUserId: string) {
    // Validate: Site cannot create ORG scope roles
    if (dto.scope === 'ORG') {
      // This should be checked at controller level, but double-check here
      // Org-level roles can only be created from org endpoints
    }
    // Validate capabilities exist
    const invalidCapabilities: string[] = [];
    for (const key of dto.capabilityKeys) {
      const capability = getCapabilityByKey(key);
      if (!capability) {
        invalidCapabilities.push(key);
      }
    }

    if (invalidCapabilities.length > 0) {
      throw new BadRequestException(
        `Invalid capabilities: ${invalidCapabilities.join(', ')}`
      );
    }

    const platformCapabilities = dto.capabilityKeys.filter((key) => this.isPlatformCapabilityKey(key));
    if (platformCapabilities.length > 0) {
      throw new BadRequestException(
        `Platform capabilities cannot be assigned to ${dto.scope} roles: ${platformCapabilities.join(', ')}`,
      );
    }

    // Check for blocked capabilities
    const blockedCapabilities = dto.capabilityKeys.filter(key => isCapabilityBlocked(key));
    if (blockedCapabilities.length > 0) {
      throw new BadRequestException(
        `Cannot assign blocked capabilities to custom roles: ${blockedCapabilities.join(', ')}`
      );
    }

    // Check if role name already exists for this org and scope
    const existing = await this.prisma.role.findUnique({
      where: {
        orgId_name_scope: {
          orgId,
          name: dto.name,
          scope: dto.scope,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Role with name "${dto.name}" already exists for scope ${dto.scope}`
      );
    }

    // Get capability IDs
    const capabilities = await this.prisma.capability.findMany({
      where: {
        key: { in: dto.capabilityKeys },
      },
    });

    if (capabilities.length !== dto.capabilityKeys.length) {
      const foundKeys = capabilities.map(c => c.key);
      const missing = dto.capabilityKeys.filter(k => !foundKeys.includes(k));
      throw new BadRequestException(
        `Capabilities not found in database: ${missing.join(', ')}`
      );
    }

    // Create role and capabilities in transaction
    const role = await this.prisma.role.create({
      data: {
        orgId,
        name: dto.name,
        description: dto.description,
        type: 'CUSTOM',
        scope: dto.scope,
        isImmutable: false,
        roleCapabilities: {
          create: capabilities.map(cap => ({
            capabilityId: cap.id,
          })),
        },
      },
      include: {
        roleCapabilities: {
          include: {
            capability: true,
          },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      scope: role.scope,
      isImmutable: role.isImmutable,
      capabilities: role.roleCapabilities.map((rc: any) => ({
        key: rc.capability.key,
        module: rc.capability.module,
        label: rc.capability.label,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Update custom role
   */
  async updateRole(
    orgId: string,
    roleId: string,
    dto: UpdateRoleDto,
    _actorUserId: string
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        orgId,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === 'SYSTEM' || role.isImmutable) {
      throw new BadRequestException('Cannot update system role');
    }

    // If updating capabilities, validate them
    if (dto.capabilityKeys) {
      const invalidCapabilities: string[] = [];
      for (const key of dto.capabilityKeys) {
        const capability = getCapabilityByKey(key);
        if (!capability) {
          invalidCapabilities.push(key);
        }
      }

      if (invalidCapabilities.length > 0) {
        throw new BadRequestException(
          `Invalid capabilities: ${invalidCapabilities.join(', ')}`
        );
      }

      const platformCapabilities = dto.capabilityKeys.filter((key) => this.isPlatformCapabilityKey(key));
      if (platformCapabilities.length > 0) {
        throw new BadRequestException(
          `Platform capabilities cannot be assigned to ${role.scope} roles: ${platformCapabilities.join(', ')}`,
        );
      }

      // Check for blocked capabilities
      const blockedCapabilities = dto.capabilityKeys.filter(key => isCapabilityBlocked(key));
      if (blockedCapabilities.length > 0) {
        throw new BadRequestException(
          `Cannot assign blocked capabilities to custom roles: ${blockedCapabilities.join(', ')}`
        );
      }

      // Get capability IDs
      const capabilities = await this.prisma.capability.findMany({
        where: {
          key: { in: dto.capabilityKeys },
        },
      });

      if (capabilities.length !== dto.capabilityKeys.length) {
        const foundKeys = capabilities.map(c => c.key);
        const missing = dto.capabilityKeys.filter(k => !foundKeys.includes(k));
        throw new BadRequestException(
          `Capabilities not found in database: ${missing.join(', ')}`
        );
      }

      // Update role and replace capabilities
      const updated = await this.prisma.$transaction(async (tx) => {
        // Delete existing capabilities
        await tx.roleCapability.deleteMany({
          where: { roleId },
        });

        // Update role
        const updatedRole = await tx.role.update({
          where: { id: roleId },
          data: {
            name: dto.name,
            description: dto.description,
            roleCapabilities: {
              create: capabilities.map(cap => ({
                capabilityId: cap.id,
              })),
            },
          },
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        });

        return updatedRole;
      });

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        type: updated.type,
        scope: updated.scope,
        isImmutable: updated.isImmutable,
        capabilities: updated.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
          label: rc.capability.label,
        })),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      // Just update name/description
      const updated = await this.prisma.role.update({
        where: { id: roleId },
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: {
          roleCapabilities: {
            include: {
              capability: true,
            },
          },
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        type: updated.type,
        scope: updated.scope,
        isImmutable: updated.isImmutable,
        capabilities: updated.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
          label: rc.capability.label,
        })),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }
  }

  /**
   * Delete custom role
   */
  async deleteRole(orgId: string, roleId: string, force: boolean = false) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        orgId,
      },
      include: {
        userRoles: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === 'SYSTEM' || role.isImmutable) {
      throw new BadRequestException('Cannot delete system role');
    }

    // Check if role is assigned
    if (role.userRoles.length > 0) {
      if (!force) {
        throw new ConflictException(
          `Role is assigned to ${role.userRoles.length} user(s). Use force=true to remove assignments and delete.`
        );
      }

      // Remove all assignments
      await this.prisma.userRole.deleteMany({
        where: { roleId },
      });
    }

    // Delete role (cascades to roleCapabilities)
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  /**
   * Get assignments
   */
  async getAssignments(orgId: string, userId?: string, siteId?: string) {
    const where: any = { orgId };
    if (userId) {
      where.userId = userId;
    }
    if (siteId !== undefined) {
      if (siteId === null) {
        where.siteId = null;
      } else {
        where.siteId = siteId;
      }
    }

    const assignments = await this.prisma.userRole.findMany({
      where,
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
        // UserRole doesn't have organization relation, use orgId from role
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      siteId: assignment.siteId,
      role: {
        id: assignment.role.id,
        name: assignment.role.name,
        type: assignment.role.type,
        scope: assignment.role.scope,
        capabilities: assignment.role.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
        })),
      },
      createdAt: assignment.createdAt,
    }));
  }

  async getPlatformAssignments(userId?: string) {
    await this.ensurePlatformRoles();

    const assignments = await this.prisma.platformUserRole.findMany({
      where: userId ? { userId } : undefined,
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      siteId: null,
      role: {
        id: assignment.role.id,
        name: assignment.role.name,
        type: assignment.role.type,
        scope: 'PLATFORM' as const,
        capabilities: assignment.role.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
        })),
      },
      createdAt: assignment.createdAt,
    }));
  }

  async createPlatformAssignment(userId: string, roleId: string) {
    await this.ensurePlatformRoles();

    const role = await this.prisma.platformRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Platform role not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const assignment = await this.prisma.platformUserRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    return {
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      siteId: null,
      role: {
        id: assignment.role.id,
        name: assignment.role.name,
        type: assignment.role.type,
        scope: 'PLATFORM' as const,
        capabilities: assignment.role.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
        })),
      },
      createdAt: assignment.createdAt,
    };
  }

  async deletePlatformAssignment(assignmentId: string) {
    const assignment = await this.prisma.platformUserRole.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Platform assignment not found');
    }

    await this.prisma.platformUserRole.delete({
      where: { id: assignmentId },
    });

    return { success: true };
  }

  /**
   * Get or create Org Member role for organization
   * This is the default lowest ORG scope role
   */
  private async getOrCreateOrgMemberRole(orgId: string) {
    // Try to find existing Org Member role
    let orgMemberRole = await this.prisma.role.findUnique({
      where: {
        orgId_name_scope: {
          orgId,
          name: 'Org Member',
          scope: 'ORG',
        },
      },
    });

    // If doesn't exist, create it
    if (!orgMemberRole) {
      // Get capability IDs for Org Member (minimal permissions)
      const capabilityKeys = ['org.view_dashboard', 'sites.view'];
      const capabilities = await this.prisma.capability.findMany({
        where: {
          key: {
            in: capabilityKeys,
          },
        },
      });

      if (capabilities.length !== capabilityKeys.length) {
        throw new NotFoundException(
          'Required capabilities for Org Member role not found. Please ensure system capabilities are seeded.',
        );
      }

      // Create Org Member role
      orgMemberRole = await this.prisma.role.create({
        data: {
          orgId,
          name: 'Org Member',
          description: 'Basic organization member with minimal permissions',
          type: 'SYSTEM',
          scope: 'ORG',
          isImmutable: true,
          roleCapabilities: {
            create: capabilities.map(cap => ({
              capabilityId: cap.id,
            })),
          },
        },
      });
    }

    return orgMemberRole;
  }

  async getPlatformRoleNames(userId: string): Promise<string[]> {
    const assignments = await this.prisma.platformUserRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return assignments.map((assignment) => assignment.role.name);
  }

  private normalizeLegacyOrgRoleKey(rawRole: string | null | undefined) {
    return coercePublicRbacUserRoleKey(String(rawRole || ''), 'ORG') || 'org_member';
  }

  async backfillLegacyPlatformAssignments(userId: string): Promise<string[]> {
    await this.ensurePlatformRoles();
    return this.getPlatformRoleNames(userId);
  }

  async backfillLegacyOrgAssignments(userId: string, orgId?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        orgId: true,
      },
    });
    if (!user) {
      return;
    }

    if (user.orgId) {
      const existingPrimaryMembership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId, orgId: user.orgId } },
        select: { role: true },
      });
      if (!existingPrimaryMembership) {
        await this.prisma.userOrg.create({
          data: {
            userId,
            orgId: user.orgId,
            role: 'org_member',
          },
        });
      }
    }

    const memberships = await this.prisma.userOrg.findMany({
      where: orgId ? { userId, orgId } : { userId },
      select: {
        orgId: true,
        role: true,
      },
    });

    for (const membership of memberships) {
      const normalizedRoleKey = this.normalizeLegacyOrgRoleKey(membership.role);

      if (membership.role !== normalizedRoleKey) {
        await this.prisma.userOrg.update({
          where: {
            userId_orgId: {
              userId,
              orgId: membership.orgId,
            },
          },
          data: { role: normalizedRoleKey },
        });
      }

      const existingAssignment = await this.prisma.userRole.findFirst({
        where: {
          orgId: membership.orgId,
          userId,
          siteId: null,
          role: {
            scope: 'ORG',
          },
        },
        select: { id: true },
      });
      if (existingAssignment) {
        continue;
      }

      const roleDefinition = getPublicRbacUserRole(normalizedRoleKey);
      if (!roleDefinition || roleDefinition.scope !== 'ORG') {
        continue;
      }

      await this.ensureSystemRoles(membership.orgId);
      const role = await this.prisma.role.findUnique({
        where: {
          orgId_name_scope: {
            orgId: membership.orgId,
            name: roleDefinition.roleName,
            scope: 'ORG',
          },
        },
        select: { id: true },
      });
      if (!role) {
        continue;
      }

      await this.prisma.userRole.create({
        data: {
          orgId: membership.orgId,
          userId,
          roleId: role.id,
          siteId: null,
        },
      });
    }
  }

  async hasPlatformManagementAccess(userId: string): Promise<boolean> {
    const platformProfile = await this.getEffectivePlatformProfile(userId);
    return platformProfile.isPlatformPowerUser;
  }

  async getEffectivePlatformProfile(userId: string) {
    const roleNames = await this.backfillLegacyPlatformAssignments(userId);
    return getPlatformAccessProfile({
      platformRbacRoles: roleNames,
    });
  }

  async getEffectivePlatformCapabilities(userId: string) {
    await this.ensurePlatformRoles();

    const capabilities = CAPABILITY_REGISTRY.filter((cap) => this.isPlatformCapabilityKey(cap.key));
    const platformProfile = await this.getEffectivePlatformProfile(userId);
    const roleSourcesByCapability = new Map<string, Set<string>>();

    const assignments = await this.prisma.platformUserRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    for (const assignment of assignments) {
      const roleName = assignment.role.name;
      for (const roleCapability of assignment.role.roleCapabilities) {
        const key = roleCapability.capability.key;
        if (!roleSourcesByCapability.has(key)) {
          roleSourcesByCapability.set(key, new Set());
        }
        roleSourcesByCapability.get(key)?.add(roleName);
      }
    }

    return capabilities.map((capability) => {
      const roleSources = Array.from(roleSourcesByCapability.get(capability.key) ?? []).sort();
      const hasBypass = platformProfile.isPlatformPowerUser;
      const allowed = hasBypass || roleSources.length > 0;

      return {
        key: capability.key,
        allowed,
        reason: allowed ? 'allowed' : 'missing_role_capability',
        policyEnabled: true,
        roleSources: hasBypass
          ? [platformProfile.roleNames[0] ?? 'Platform Root']
          : roleSources,
      };
    });
  }

  /**
   * Create assignment
   */
  async createAssignment(orgId: string, dto: CreateAssignmentDto, _actorUserId: string) {
    // Verify role exists and belongs to org
    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        orgId,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify user exists and belongs to org
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        orgId: orgId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate scope rules
    if (role.scope === 'SITE' && !dto.siteId) {
      throw new BadRequestException('SITE scope role requires siteId');
    }

    if (role.scope === 'ORG' && dto.siteId) {
      throw new BadRequestException('ORG scope role cannot have siteId');
    }

    // If SITE scope, verify site exists and belongs to org
    if (dto.siteId) {
      const site = await this.prisma.site.findFirst({
        where: {
          id: dto.siteId,
          orgId, // Verify site belongs to organization
        },
      });

      if (!site) {
        throw new NotFoundException('Site not found or does not belong to this organization');
      }
    }

    // Check if assignment already exists
    const existing = await this.prisma.userRole.findFirst({
      where: {
        orgId,
        userId: dto.userId,
        roleId: dto.roleId,
        siteId: dto.siteId || null,
      },
    });

    if (existing) {
      throw new ConflictException('Assignment already exists');
    }

    // If assigning SITE scope role, ensure user has at least one ORG scope role
    // If not, automatically assign "Org Member" (lowest ORG scope role)
    if (role.scope === 'SITE' && dto.siteId) {
      const hasOrgRole = await this.prisma.userRole.findFirst({
        where: {
          orgId,
          userId: dto.userId,
          role: {
            scope: 'ORG',
          },
          siteId: null, // ORG scope roles have siteId = null
        },
      });

      // If user doesn't have any ORG scope role, assign "Org Member" automatically
      if (!hasOrgRole) {
        const orgMemberRole = await this.getOrCreateOrgMemberRole(orgId);

        // Check if Org Member assignment already exists (shouldn't, but safety check)
        const existingOrgMember = await this.prisma.userRole.findFirst({
          where: {
            orgId,
            userId: dto.userId,
            roleId: orgMemberRole.id,
            siteId: null,
          },
        });

        if (!existingOrgMember) {
          await this.prisma.userRole.create({
            data: {
              orgId,
              userId: dto.userId,
              roleId: orgMemberRole.id,
              siteId: null, // ORG scope
            },
          });
        }
      }
    }

    // Create assignment
    const assignment = await this.prisma.userRole.create({
      data: {
        orgId,
        userId: dto.userId,
        roleId: dto.roleId,
        siteId: dto.siteId || null,
      },
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    return {
      id: assignment.id,
      userId: assignment.userId,
      roleId: assignment.roleId,
      siteId: assignment.siteId,
      role: {
        id: assignment.role.id,
        name: assignment.role.name,
        type: assignment.role.type,
        scope: assignment.role.scope,
        capabilities: assignment.role.roleCapabilities.map((rc: any) => ({
          key: rc.capability.key,
          module: rc.capability.module,
        })),
      },
      createdAt: assignment.createdAt,
    };
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(orgId: string, assignmentId: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        id: assignmentId,
        orgId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.userRole.delete({
      where: { id: assignmentId },
    });

    return { success: true };
  }

  /**
   * Get policies
   */
  async getPolicies(orgId: string) {
    const policies = await this.prisma.orgPolicy.findMany({
      where: { orgId },
      orderBy: { capabilityKey: 'asc' },
    });

    return policies.map(policy => ({
      id: policy.id,
      capabilityKey: policy.capabilityKey,
      enabled: policy.enabled,
      createdByUserId: policy.createdByUserId,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));
  }

  /**
   * Update policy
   */
  async updatePolicy(
    orgId: string,
    capabilityKey: string,
    dto: UpdatePolicyDto,
    _actorUserId: string
  ) {
    // Verify capability exists
    const capability = getCapabilityByKey(capabilityKey);
    if (!capability) {
      throw new NotFoundException(`Capability not found: ${capabilityKey}`);
    }

    // Check if capability can be policy controlled
    if (!capability.canBePolicyControlled) {
      throw new BadRequestException(
        `Capability "${capabilityKey}" cannot be controlled by policy`
      );
    }

    // Upsert policy
    const policy = await this.prisma.orgPolicy.upsert({
      where: {
        orgId_capabilityKey: {
          orgId,
          capabilityKey,
        },
      },
      create: {
        orgId,
        capabilityKey,
        enabled: dto.enabled,
        createdByUserId: _actorUserId,
      },
      update: {
        enabled: dto.enabled,
      },
    });

    return {
      id: policy.id,
      capabilityKey: policy.capabilityKey,
      enabled: policy.enabled,
      createdByUserId: policy.createdByUserId,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  /**
   * Check if user can perform action (helper for authorization)
   */
  async canUserPerform(
    orgId: string,
    userId: string,
    capabilityKey: string,
    siteId?: string
  ): Promise<boolean> {
    const effectivePlatformProfile = await this.getEffectivePlatformProfile(userId);
    if (effectivePlatformProfile.isPlatformPowerUser) {
      return true;
    }

    if (this.isPlatformCapabilityKey(capabilityKey)) {
      const platformAssignments = await this.prisma.platformUserRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              roleCapabilities: {
                include: {
                  capability: true,
                },
              },
            },
          },
        },
      });

      return platformAssignments.some((assignment) =>
        assignment.role.roleCapabilities.some((roleCapability) => roleCapability.capability.key === capabilityKey),
      );
    }

    // Get user's roles
    const where: any = {
      orgId,
      userId,
    };

    if (siteId) {
      // Check both ORG roles and SITE roles for this site
      where.OR = [
        {
          role: {
            scope: 'ORG',
          },
        },
        {
          role: {
            scope: 'SITE',
          },
          siteId,
        },
      ];
    } else {
      // Only ORG roles
      where.role = {
        scope: 'ORG',
      };
    }

    const assignments = await this.prisma.userRole.findMany({
      where,
      include: {
        role: {
          include: {
            roleCapabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    // Check if any role has the capability
    for (const assignment of assignments) {
      const hasCapability = assignment.role.roleCapabilities.some(
        rc => rc.capability.key === capabilityKey
      );

      if (hasCapability) {
        // Check policy
        const policy = await this.prisma.orgPolicy.findUnique({
          where: {
            orgId_capabilityKey: {
              orgId,
              capabilityKey,
            },
          },
        });

        // Policy defaults to enabled if not set
        const policyEnabled = policy?.enabled ?? true;
        return policyEnabled;
      }
    }

    return false;
  }
}

