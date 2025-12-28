import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CAPABILITY_REGISTRY, getCapabilityByKey } from '@repo/schemas';

export type RbacCanParams = {
  userId: string;
  orgId: string;
  siteId?: string;
  capabilityKey: string;
};

export type RbacCanResult = {
  allowed: boolean;
  reason: 'allowed' | 'blocked_by_policy' | 'missing_role_capability' | 'unknown_capability';
  policyEnabled: boolean;
  roleSources: string[];
};

type EvaluationContext = {
  policyMap: Map<string, boolean>;
  roleSourcesByCapability: Map<string, Set<string>>;
};

@Injectable()
export class RbacEvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  async can(params: RbacCanParams): Promise<RbacCanResult> {
    const context = await this.buildContext(params.orgId, params.userId, params.siteId);
    return this.evaluateWithContext(params.capabilityKey, context);
  }

  async getEffectiveCapabilities(params: Omit<RbacCanParams, 'capabilityKey'>) {
    const context = await this.buildContext(params.orgId, params.userId, params.siteId);

    return CAPABILITY_REGISTRY.map(capability => ({
      key: capability.key,
      ...this.evaluateWithContext(capability.key, context),
    }));
  }

  private async buildContext(orgId: string, userId: string, siteId?: string): Promise<EvaluationContext> {
    const roleSourcesByCapability = new Map<string, Set<string>>();

    const where: any = {
      orgId,
      userId,
    };

    if (siteId) {
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

    for (const assignment of assignments) {
      const role = assignment.role;
      const sourceLabel = `${role.name}`;

      for (const roleCap of role.roleCapabilities) {
        const key = roleCap.capability.key;
        if (!roleSourcesByCapability.has(key)) {
          roleSourcesByCapability.set(key, new Set());
        }
        roleSourcesByCapability.get(key)?.add(sourceLabel);
      }
    }

    const policies = await this.prisma.orgPolicy.findMany({
      where: { orgId },
    });

    const policyMap = new Map(policies.map(policy => [policy.capabilityKey, policy.enabled]));

    return { policyMap, roleSourcesByCapability };
  }

  private evaluateWithContext(capabilityKey: string, context: EvaluationContext): RbacCanResult {
    const capability = getCapabilityByKey(capabilityKey);
    if (!capability) {
      return {
        allowed: false,
        reason: 'unknown_capability',
        policyEnabled: false,
        roleSources: [],
      };
    }

    const roleSources = Array.from(context.roleSourcesByCapability.get(capabilityKey) ?? []).sort();
    const hasRoleCapability = roleSources.length > 0;
    const policyEnabled = context.policyMap.get(capabilityKey) ?? capability.defaultPolicyEnabled;

    if (!hasRoleCapability) {
      return {
        allowed: false,
        reason: 'missing_role_capability',
        policyEnabled,
        roleSources,
      };
    }

    if (!policyEnabled) {
      return {
        allowed: false,
        reason: 'blocked_by_policy',
        policyEnabled,
        roleSources,
      };
    }

    return {
      allowed: true,
      reason: 'allowed',
      policyEnabled,
      roleSources,
    };
  }
}
