export type RbacRoleScope = 'PLATFORM' | 'ORG' | 'SITE';

export type SystemRoleDefinition = {
  name: string;
  description: string;
  scope: RbacRoleScope;
  capabilityKeys: string[];
};

const PLATFORM_DEVELOPER_CAPABILITIES = [
  'platform.dashboard.view',
  'platform.organizations.view',
  'platform.users.view',
  'platform.roles.view',
  'platform.audit.view',
  'platform.support.impersonate',
  'platform.dev.tools.access',
  'platform.dev.logs.view',
  'platform.dev.jobs.manage',
];

const PLATFORM_SUPPORT_CAPABILITIES = [
  'platform.dashboard.view',
  'platform.organizations.view',
  'platform.users.view',
  'platform.roles.view',
  'platform.billing.view',
  'platform.audit.view',
  'platform.support.impersonate',
];

const SITE_ADMIN_CAPABILITIES = [
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
  'sites.settings.view',
  'sites.settings.manage',
  'marketing.view',
  'marketing.content.edit',
  'marketing.publish',
  'marketing.campaign.manage',
  'marketing.stats.view',
];

export function buildSystemRoleDefinitions(allCapabilityKeys: string[]): SystemRoleDefinition[] {
  const platformCapabilityKeys = allCapabilityKeys.filter((key) => key.startsWith('platform.'));
  const tenantCapabilityKeys = allCapabilityKeys.filter((key) => !key.startsWith('platform.'));

  return [
    {
      name: 'Platform Root',
      description: 'Emergency break-glass root role with unrestricted platform access',
      scope: 'PLATFORM',
      capabilityKeys: platformCapabilityKeys,
    },
    {
      name: 'Platform Admin',
      description: 'Operational administrator for the entire platform',
      scope: 'PLATFORM',
      capabilityKeys: platformCapabilityKeys,
    },
    {
      name: 'Platform Developer',
      description: 'Technical role for platform developers and internal engineering',
      scope: 'PLATFORM',
      capabilityKeys: PLATFORM_DEVELOPER_CAPABILITIES,
    },
    {
      name: 'Platform Support',
      description: 'Support role with read-heavy access and audited impersonation',
      scope: 'PLATFORM',
      capabilityKeys: PLATFORM_SUPPORT_CAPABILITIES,
    },
    {
      name: 'Org Owner',
      description: 'Full access to organization including billing and role management',
      scope: 'ORG',
      capabilityKeys: tenantCapabilityKeys,
    },
    {
      name: 'Org Admin',
      description: 'Full technical access except billing and role management',
      scope: 'ORG',
      capabilityKeys: tenantCapabilityKeys.filter(
        (key) => !key.startsWith('billing.') && key !== 'org.roles.manage',
      ),
    },
    {
      name: 'Org Member',
      description: 'Basic organization member with minimal permissions',
      scope: 'ORG',
      capabilityKeys: ['org.view_dashboard', 'sites.view'],
    },
    {
      name: 'Site Admin',
      description: 'Full access to site builder, content, and site settings',
      scope: 'SITE',
      capabilityKeys: SITE_ADMIN_CAPABILITIES,
    },
    {
      name: 'Editor-in-Chief',
      description: 'Can edit, save drafts, publish, and rollback',
      scope: 'SITE',
      capabilityKeys: [
        'builder.view',
        'builder.edit',
        'builder.draft.save',
        'builder.publish',
        'builder.rollback',
        'builder.history.view',
        'content.view',
        'content.create',
        'content.edit',
        'content.publish',
        'content.media.manage',
      ],
    },
    {
      name: 'Editor',
      description: 'Can edit and save drafts, but cannot publish',
      scope: 'SITE',
      capabilityKeys: [
        'builder.view',
        'builder.edit',
        'builder.draft.save',
        'builder.history.view',
        'content.view',
        'content.create',
        'content.edit',
        'content.media.manage',
      ],
    },
    {
      name: 'Publisher',
      description: 'Can publish and rollback, but cannot edit',
      scope: 'SITE',
      capabilityKeys: [
        'builder.view',
        'builder.publish',
        'builder.rollback',
        'builder.history.view',
        'content.view',
        'content.publish',
      ],
    },
    {
      name: 'Viewer',
      description: 'Read-only access to builder, content, and analytics',
      scope: 'SITE',
      capabilityKeys: ['builder.view', 'content.view', 'analytics.view'],
    },
    {
      name: 'Marketing Manager',
      description: 'Full marketing access including campaigns and ads',
      scope: 'SITE',
      capabilityKeys: [
        'marketing.view',
        'marketing.content.edit',
        'marketing.publish',
        'marketing.campaign.manage',
        'marketing.stats.view',
        'marketing.schedule',
        'marketing.ads.manage',
      ],
    },
    {
      name: 'Marketing Editor',
      description: 'Can edit marketing content',
      scope: 'SITE',
      capabilityKeys: ['marketing.view', 'marketing.content.edit'],
    },
    {
      name: 'Marketing Publisher',
      description: 'Can publish marketing content',
      scope: 'SITE',
      capabilityKeys: ['marketing.view', 'marketing.publish'],
    },
    {
      name: 'Marketing Viewer',
      description: 'Read-only access to marketing',
      scope: 'SITE',
      capabilityKeys: ['marketing.view', 'marketing.stats.view'],
    },
  ];
}
