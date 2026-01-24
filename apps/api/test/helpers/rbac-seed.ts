import { PrismaService } from '../../src/common/prisma/prisma.service';

const CAPABILITY_KEYS = [
  'org.view_dashboard',
  'org.users.view',
  'org.users.invite',
  'org.users.remove',
  'org.roles.view',
  'org.roles.manage',
  'org.policies.view',
  'org.policies.manage',
  'billing.view_plan',
  'billing.change_plan',
  'billing.view_invoices',
  'billing.manage_payment_methods',
  'sites.view',
  'sites.create',
  'sites.delete',
  'sites.settings.view',
  'sites.settings.manage',
  'builder.view',
  'builder.edit',
  'builder.draft.save',
  'builder.publish',
  'builder.rollback',
  'builder.history.view',
  'builder.assets.upload',
  'builder.assets.delete',
  'builder.custom_code',
  'builder.site_roles.manage',
  'content.view',
  'content.create',
  'content.edit',
  'content.delete',
  'content.publish',
  'content.media.manage',
  'hosting.usage.view',
  'hosting.deploy',
  'hosting.files.view',
  'hosting.files.edit',
  'hosting.logs.view',
  'hosting.backups.manage',
  'hosting.restart.manage',
  'domains.view',
  'domains.assign',
  'domains.dns.manage',
  'domains.ssl.manage',
  'domains.add_remove',
  'marketing.view',
  'marketing.content.edit',
  'marketing.schedule',
  'marketing.publish',
  'marketing.campaign.manage',
  'marketing.social.connect',
  'marketing.ads.manage',
  'marketing.stats.view',
  'analytics.view',
] as const;

type CapabilityKey = typeof CAPABILITY_KEYS[number];

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
  return ensureRoleWithCapabilities(prisma, {
    orgId,
    name: 'Org Owner',
    scope: 'ORG',
    capabilityKeys: CAPABILITY_KEYS as unknown as string[],
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