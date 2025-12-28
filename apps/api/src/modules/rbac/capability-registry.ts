/**
 * Capability Registry - Source of Truth
 * 
 * This is the ONLY catalog of capabilities in the system.
 * All capabilities must be defined here before use.
 * 
 * Format: {module}.{action} (e.g., "builder.publish", "org.users.invite")
 */

export interface CapabilityDefinition {
  key: string;
  module: string;
  label: string;
  description?: string;
  riskLevel: 'LOW' | 'MED' | 'HIGH';
  isDangerous: boolean;
  canBePolicyControlled?: boolean; // ⚠️ Can be toggled via org policy
  blockedForCustomRoles?: boolean; // Cannot be assigned to custom roles
}

/**
 * Complete capability registry - the single source of truth
 */
export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  // ============================================
  // Organization Module
  // ============================================
  {
    key: 'org.view_dashboard',
    module: 'org',
    label: 'View Organization Dashboard',
    description: 'View organization dashboard and overview',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'org.users.view',
    module: 'org',
    label: 'View Users',
    description: 'View organization users list',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'org.users.invite',
    module: 'org',
    label: 'Invite Users',
    description: 'Invite new users to organization',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'org.users.remove',
    module: 'org',
    label: 'Remove Users',
    description: 'Remove users from organization',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'org.roles.view',
    module: 'org',
    label: 'View Roles',
    description: 'View organization roles and permissions',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'org.roles.manage',
    module: 'org',
    label: 'Manage Roles',
    description: 'Create, edit, and delete custom roles',
    riskLevel: 'HIGH',
    isDangerous: true,
    blockedForCustomRoles: true, // Only Owner can manage roles
  },
  {
    key: 'org.policies.view',
    module: 'org',
    label: 'View Policies',
    description: 'View organization policies (capability toggles)',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'org.policies.manage',
    module: 'org',
    label: 'Manage Policies',
    description: 'Enable/disable capabilities via organization policies',
    riskLevel: 'HIGH',
    isDangerous: true,
    blockedForCustomRoles: true, // Only Owner (and Org Admin if Owner allows)
  },

  // ============================================
  // Billing Module (Owner only, blocked for custom roles)
  // ============================================
  {
    key: 'billing.view_plan',
    module: 'billing',
    label: 'View Plan',
    description: 'View current subscription plan',
    riskLevel: 'LOW',
    isDangerous: false,
    blockedForCustomRoles: true,
  },
  {
    key: 'billing.change_plan',
    module: 'billing',
    label: 'Change Plan',
    description: 'Change subscription plan',
    riskLevel: 'HIGH',
    isDangerous: true,
    blockedForCustomRoles: true,
  },
  {
    key: 'billing.view_invoices',
    module: 'billing',
    label: 'View Invoices',
    description: 'View billing invoices',
    riskLevel: 'LOW',
    isDangerous: false,
    blockedForCustomRoles: true,
  },
  {
    key: 'billing.manage_payment_methods',
    module: 'billing',
    label: 'Manage Payment Methods',
    description: 'Add, update, or remove payment methods',
    riskLevel: 'MED',
    isDangerous: false,
    blockedForCustomRoles: true,
  },

  // ============================================
  // Sites Module
  // ============================================
  {
    key: 'sites.view',
    module: 'sites',
    label: 'View Sites',
    description: 'View list of sites in organization',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'sites.create',
    module: 'sites',
    label: 'Create Sites',
    description: 'Create new sites',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'sites.delete',
    module: 'sites',
    label: 'Delete Sites',
    description: 'Delete sites',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'sites.settings.view',
    module: 'sites',
    label: 'View Site Settings',
    description: 'View site settings',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'sites.settings.manage',
    module: 'sites',
    label: 'Manage Site Settings',
    description: 'Edit site settings (usually Site Admin)',
    riskLevel: 'MED',
    isDangerous: false,
  },

  // ============================================
  // Builder Module
  // ============================================
  {
    key: 'builder.view',
    module: 'builder',
    label: 'View Builder',
    description: 'View page builder interface',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'builder.edit',
    module: 'builder',
    label: 'Edit Builder',
    description: 'Edit pages in builder',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'builder.draft.save',
    module: 'builder',
    label: 'Save Draft',
    description: 'Save draft changes',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'builder.publish',
    module: 'builder',
    label: 'Publish',
    description: 'Publish pages to production',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'builder.rollback',
    module: 'builder',
    label: 'Rollback',
    description: 'Rollback to previous version',
    riskLevel: 'HIGH',
    isDangerous: true,
    canBePolicyControlled: true, // ⚠️
  },
  {
    key: 'builder.history.view',
    module: 'builder',
    label: 'View History',
    description: 'View page version history',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'builder.assets.upload',
    module: 'builder',
    label: 'Upload Assets',
    description: 'Upload assets to builder',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'builder.assets.delete',
    module: 'builder',
    label: 'Delete Assets',
    description: 'Delete builder assets',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'builder.custom_code',
    module: 'builder',
    label: 'Custom Code',
    description: 'Manage custom code (only Site Admin)',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'builder.site_roles.manage',
    module: 'builder',
    label: 'Manage Site Roles',
    description: 'Manage roles for site (only Site Admin / Owner)',
    riskLevel: 'HIGH',
    isDangerous: true,
  },

  // ============================================
  // CMS / Content Module
  // ============================================
  {
    key: 'content.view',
    module: 'content',
    label: 'View Content',
    description: 'View content entries',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'content.create',
    module: 'content',
    label: 'Create Content',
    description: 'Create new content entries',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'content.edit',
    module: 'content',
    label: 'Edit Content',
    description: 'Edit content entries',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'content.delete',
    module: 'content',
    label: 'Delete Content',
    description: 'Delete content entries',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'content.publish',
    module: 'content',
    label: 'Publish Content',
    description: 'Publish content entries (if content has separate publish)',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'content.media.manage',
    module: 'content',
    label: 'Manage Media',
    description: 'Upload and delete media files',
    riskLevel: 'MED',
    isDangerous: false,
  },

  // ============================================
  // Hosting Module (Owner + Org Admin only)
  // ============================================
  {
    key: 'hosting.usage.view',
    module: 'hosting',
    label: 'View Usage',
    description: 'View hosting usage statistics',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'hosting.deploy',
    module: 'hosting',
    label: 'Deploy',
    description: 'Deploy sites to hosting',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'hosting.files.view',
    module: 'hosting',
    label: 'View Files',
    description: 'View hosting files',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'hosting.files.edit',
    module: 'hosting',
    label: 'Edit Files',
    description: 'Edit hosting files',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'hosting.logs.view',
    module: 'hosting',
    label: 'View Logs',
    description: 'View hosting logs',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'hosting.backups.manage',
    module: 'hosting',
    label: 'Manage Backups',
    description: 'Create and restore backups',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'hosting.restart.manage',
    module: 'hosting',
    label: 'Restart Services',
    description: 'Restart hosting services',
    riskLevel: 'HIGH',
    isDangerous: true,
  },

  // ============================================
  // Domains Module (Owner + Org Admin only)
  // ============================================
  {
    key: 'domains.view',
    module: 'domains',
    label: 'View Domains',
    description: 'View domain configurations',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'domains.assign',
    module: 'domains',
    label: 'Assign Domains',
    description: 'Assign domains to sites',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'domains.dns.manage',
    module: 'domains',
    label: 'Manage DNS',
    description: 'Manage DNS records',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'domains.ssl.manage',
    module: 'domains',
    label: 'Manage SSL',
    description: 'Manage SSL certificates',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'domains.add_remove',
    module: 'domains',
    label: 'Add/Remove Domains',
    description: 'Add or remove domains (usually Owner)',
    riskLevel: 'HIGH',
    isDangerous: true,
  },

  // ============================================
  // Marketing Module
  // ============================================
  {
    key: 'marketing.view',
    module: 'marketing',
    label: 'View Marketing',
    description: 'View marketing dashboard',
    riskLevel: 'LOW',
    isDangerous: false,
  },
  {
    key: 'marketing.content.edit',
    module: 'marketing',
    label: 'Edit Marketing Content',
    description: 'Edit marketing content',
    riskLevel: 'MED',
    isDangerous: false,
  },
  {
    key: 'marketing.schedule',
    module: 'marketing',
    label: 'Schedule Posts',
    description: 'Schedule social media posts',
    riskLevel: 'MED',
    isDangerous: false,
    canBePolicyControlled: true, // ⚠️
  },
  {
    key: 'marketing.publish',
    module: 'marketing',
    label: 'Publish Marketing',
    description: 'Publish marketing content',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'marketing.campaign.manage',
    module: 'marketing',
    label: 'Manage Campaigns',
    description: 'Create and manage marketing campaigns',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'marketing.social.connect',
    module: 'marketing',
    label: 'Connect Social Accounts',
    description: 'Connect social media accounts (Admin modułu / Owner)',
    riskLevel: 'HIGH',
    isDangerous: true,
  },
  {
    key: 'marketing.ads.manage',
    module: 'marketing',
    label: 'Manage Ads',
    description: 'Manage advertising campaigns',
    riskLevel: 'HIGH',
    isDangerous: true,
    canBePolicyControlled: true, // ⚠️
  },
  {
    key: 'marketing.stats.view',
    module: 'marketing',
    label: 'View Marketing Stats',
    description: 'View marketing statistics',
    riskLevel: 'LOW',
    isDangerous: false,
  },

  // ============================================
  // Analytics Module
  // ============================================
  {
    key: 'analytics.view',
    module: 'analytics',
    label: 'View Analytics',
    description: 'View analytics and reports',
    riskLevel: 'LOW',
    isDangerous: false,
  },
];

/**
 * Get all capabilities
 */
export function getAllCapabilities(): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY;
}

/**
 * Get capability by key
 */
export function getCapabilityByKey(key: string): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY.find(cap => cap.key === key);
}

/**
 * Get capabilities by module
 */
export function getCapabilitiesByModule(module: string): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter(cap => cap.module === module);
}

/**
 * Get blocked capabilities (cannot be assigned to custom roles)
 */
export function getBlockedCapabilities(): string[] {
  return CAPABILITY_REGISTRY
    .filter(cap => cap.blockedForCustomRoles)
    .map(cap => cap.key);
}

/**
 * Check if capability is blocked for custom roles
 */
export function isCapabilityBlocked(key: string): boolean {
  const capability = getCapabilityByKey(key);
  return capability?.blockedForCustomRoles === true;
}

