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
} from '@repo/schemas';
import { CreateRoleDto, UpdateRoleDto, CreateAssignmentDto, UpdatePolicyDto } from './dto';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

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
    return CAPABILITY_REGISTRY.map(cap => ({
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

  /**
   * Get roles (system + custom) with optional scope filter
   */
  async getRoles(orgId: string, scope?: 'ORG' | 'SITE') {
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
      capabilities: role.roleCapabilities.map(rc => ({
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
   */
  async createRole(orgId: string, dto: CreateRoleDto, _actorUserId: string) {
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
      capabilities: role.roleCapabilities.map(rc => ({
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
        capabilities: updated.roleCapabilities.map(rc => ({
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
        capabilities: updated.roleCapabilities.map(rc => ({
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
        tenant: true, // For org info
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
        capabilities: assignment.role.roleCapabilities.map(rc => ({
          key: rc.capability.key,
          module: rc.capability.module,
        })),
      },
      createdAt: assignment.createdAt,
    }));
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
        tenantId: orgId,
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

    // If SITE scope, verify site exists
    if (dto.siteId) {
      const site = await this.prisma.tenant.findFirst({
        where: {
          id: dto.siteId,
          // In a multi-tenant system, you might want to verify site belongs to org
        },
      });

      if (!site) {
        throw new NotFoundException('Site not found');
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
        capabilities: assignment.role.roleCapabilities.map(rc => ({
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

