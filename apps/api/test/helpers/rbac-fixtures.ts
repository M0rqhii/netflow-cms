/**
 * RBAC Test Fixtures
 * 
 * Pre-defined test data for RBAC integration tests
 */

export const RbacFixtures = {
  /**
   * Capability keys for testing
   */
  capabilities: {
    builder: {
      edit: 'builder.edit',
      publish: 'builder.publish',
      view: 'builder.view',
    },
    marketing: {
      adsManage: 'marketing.ads.manage',
      publish: 'marketing.publish',
      view: 'marketing.view',
    },
    domains: {
      view: 'domains.view',
      assign: 'domains.assign',
      dnsManage: 'domains.dns.manage',
    },
    hosting: {
      view: 'hosting.view',
      deploy: 'hosting.deploy',
      logsView: 'hosting.logs.view',
    },
    billing: {
      viewPlan: 'billing.view_plan',
      changePlan: 'billing.change_plan',
    },
    org: {
      rolesManage: 'org.roles.manage',
      policiesManage: 'org.policies.manage',
    },
  },

  /**
   * Custom role definitions
   */
  customRoles: {
    siteEditor: {
      name: 'SITE Editor',
      description: 'Custom role for site editing',
      scope: 'SITE' as const,
      capabilityKeys: ['builder.edit', 'builder.view'],
    },
    marketingManager: {
      name: 'Marketing Manager',
      description: 'Custom role for marketing management',
      scope: 'ORG' as const,
      capabilityKeys: ['marketing.view', 'marketing.publish', 'marketing.ads.manage'],
    },
    contentEditor: {
      name: 'Content Editor',
      description: 'Custom role for content editing',
      scope: 'ORG' as const,
      capabilityKeys: ['content.view', 'content.edit', 'content.create'],
    },
  },

  /**
   * Policy configurations
   */
  policies: {
    marketingAdsDisabled: {
      capabilityKey: 'marketing.ads.manage',
      enabled: false,
    },
    marketingAdsEnabled: {
      capabilityKey: 'marketing.ads.manage',
      enabled: true,
    },
    builderRollbackDisabled: {
      capabilityKey: 'builder.rollback',
      enabled: false,
    },
  },

  /**
   * Assignment test data
   */
  assignments: {
    siteAssignment: {
      // siteId will be provided at test time
      // roleId will be provided at test time
      // userId will be provided at test time
    },
    orgAssignment: {
      // roleId will be provided at test time
      // userId will be provided at test time
      siteId: null,
    },
  },
};





