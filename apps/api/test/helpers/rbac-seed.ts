import { PrismaService } from '../../src/common/prisma/prisma.service';
import { CAPABILITY_REGISTRY } from '@repo/schemas';
import { buildSystemRoleDefinitions } from '../../src/modules/rbac/system-role-definitions';

const CAPABILITY_KEYS = CAPABILITY_REGISTRY.map((capability) => capability.key);
type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

const toCapabilityData = (key: CapabilityKey) => ({
  key,
  module: key.split('.')[0],
  label: key,
  description: key,
  riskLevel: 'LOW',
  isDangerous: false,
});

export async function ensureCapabilities(prisma: PrismaService) {
  const existing = await prisma.capability.findMany({
    where: { key: { in: CAPABILITY_KEYS as unknown as string[] } },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((cap) => cap.key));
  const toCreate = CAPABILITY_KEYS.filter((key) => !existingKeys.has(key)).map(toCapabilityData);

  if (toCreate.length > 0) {
    await prisma.capability.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  return CAPABILITY_KEYS;
}

export async function ensureRoleWithCapabilities(prisma: PrismaService, params: {
  orgId: string;
  name: string;
  scope: 'ORG' | 'SITE';
  capabilityKeys: string[];
  type?: 'SYSTEM' | 'CUSTOM';
  isImmutable?: boolean;
}) {
  const role = await prisma.role.upsert({
    where: {
      orgId_name_scope: {
        orgId: params.orgId,
        name: params.name,
        scope: params.scope,
      },
    },
    update: {},
    create: {
      orgId: params.orgId,
      name: params.name,
      description: `${params.name} (seeded)`,
      type: params.type ?? 'CUSTOM',
      scope: params.scope,
      isImmutable: params.isImmutable ?? false,
    },
  });

  const capabilities = await prisma.capability.findMany({
    where: { key: { in: params.capabilityKeys } },
    select: { id: true },
  });

  await prisma.roleCapability.deleteMany({ where: { roleId: role.id } });
  if (capabilities.length > 0) {
    await prisma.roleCapability.createMany({
      data: capabilities.map((capability) => ({
        roleId: role.id,
        capabilityId: capability.id,
      })),
      skipDuplicates: true,
    });
  }

  return role;
}

export async function ensureOrgOwnerRole(prisma: PrismaService, orgId: string) {
  const definitions = buildSystemRoleDefinitions(CAPABILITY_KEYS as string[]);
  const orgOwner = definitions.find((definition) => definition.scope === 'ORG' && definition.name === 'Org Owner');
  return ensureRoleWithCapabilities(prisma, {
    orgId,
    name: 'Org Owner',
    scope: 'ORG',
    capabilityKeys: orgOwner?.capabilityKeys || [],
    type: 'SYSTEM',
    isImmutable: true,
  });
}

export async function ensureUserRole(prisma: PrismaService, params: {
  orgId: string;
  userId: string;
  roleId: string;
  siteId?: string | null;
}) {
  const existing = await prisma.userRole.findFirst({
    where: {
      orgId: params.orgId,
      userId: params.userId,
      roleId: params.roleId,
      siteId: params.siteId ?? null,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.userRole.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      roleId: params.roleId,
      siteId: params.siteId ?? null,
    },
  });
}

export async function ensurePlatformRoleWithCapabilities(prisma: PrismaService, params: {
  name: string;
  capabilityKeys: string[];
  type?: 'SYSTEM' | 'CUSTOM';
  isImmutable?: boolean;
}) {
  const role = await prisma.platformRole.upsert({
    where: {
      name: params.name,
    },
    update: {},
    create: {
      name: params.name,
      description: `${params.name} (seeded)`,
      type: params.type ?? 'CUSTOM',
      isImmutable: params.isImmutable ?? false,
    },
  });

  const capabilities = await prisma.capability.findMany({
    where: { key: { in: params.capabilityKeys } },
    select: { id: true },
  });

  await prisma.platformRoleCapability.deleteMany({ where: { roleId: role.id } });
  if (capabilities.length > 0) {
    await prisma.platformRoleCapability.createMany({
      data: capabilities.map((capability) => ({
        roleId: role.id,
        capabilityId: capability.id,
      })),
      skipDuplicates: true,
    });
  }

  return role;
}

export async function ensurePlatformUserRole(prisma: PrismaService, params: {
  userId: string;
  roleId: string;
}) {
  return prisma.platformUserRole.upsert({
    where: {
      userId_roleId: {
        userId: params.userId,
        roleId: params.roleId,
      },
    },
    update: {},
    create: {
      userId: params.userId,
      roleId: params.roleId,
    },
  });
}
