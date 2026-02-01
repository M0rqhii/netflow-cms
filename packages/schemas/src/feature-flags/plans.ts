/**
 * Plans Configuration - Mapping plans to features and limits
 * AI Note: This defines what features are available per plan
 */

import { getAllFeatureKeys } from './features';

/**
 * Plan names enum
 * Must match the values used in Tenant.plan and Subscription.plan
 * Note: Tenant.plan uses: 'free', 'professional', 'enterprise'
 * Subscription.plan uses: 'BASIC', 'PRO' (from Plan enum)
 * We support both conventions for compatibility
 */
export enum Plan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Plan limits configuration
 */
export interface PlanLimits {
  maxPages?: number;
  maxCollections?: number;
  maxContentTypes?: number;
  maxMediaFiles?: number;
  maxStorageMB?: number;
  maxUsers?: number;
  maxWebhooks?: number;
  maxApiRequestsPerMonth?: number;
}

/**
 * Plan configuration
 */
export interface PlanConfig {
  name: string;
  features: string[]; // Feature keys
  limits?: PlanLimits;
}

/**
 * Plans configuration mapping
 * Supports both 'free'/'professional'/'enterprise' (Tenant) and 'basic'/'pro' (Subscription) conventions
 */
export const PLANS: Record<string, PlanConfig> = {
  // Tenant plan names
  [Plan.FREE]: {
    name: 'Free',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'media_manager',
      'seo_settings',
      'api_access',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
    ],
    limits: {
      maxPages: 10,
      maxCollections: 3,
      maxContentTypes: 5,
      maxMediaFiles: 50,
      maxStorageMB: 100,
      maxUsers: 1,
      maxWebhooks: 0,
      maxApiRequestsPerMonth: 1000,
    },
  },
  [Plan.BASIC]: {
    name: 'Basic',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'media_manager',
      'media_transformations',
      'seo_settings',
      'sitemap_generation',
      'environment_deployment',
      'webhooks',
      'api_access',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
    ],
    limits: {
      maxPages: 50,
      maxCollections: 10,
      maxContentTypes: 20,
      maxMediaFiles: 500,
      maxStorageMB: 1000,
      maxUsers: 5,
      maxWebhooks: 10,
      maxApiRequestsPerMonth: 10000,
    },
  },
  [Plan.PRO]: {
    name: 'Pro',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'snapshots',
      'media_manager',
      'media_transformations',
      'cdn_integration',
      'seo_settings',
      'seo_analytics',
      'sitemap_generation',
      'custom_domains',
      'ssl_certificates',
      'environment_deployment',
      'backup_restore',
      'webhooks',
      'api_access',
      'graphql_api',
      'third_party_integrations',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
      'payments',
      'shop',
      'analytics',
      'meta-pixel',
      'tag-manager',
    ],
    limits: {
      maxPages: 500,
      maxCollections: 100,
      maxContentTypes: 200,
      maxMediaFiles: 5000,
      maxStorageMB: 10000,
      maxUsers: 25,
      maxWebhooks: 50,
      maxApiRequestsPerMonth: 100000,
    },
  },
  [Plan.ENTERPRISE]: {
    name: 'Enterprise',
    features: getAllFeatureKeys(), // All features enabled
    limits: {
      // Unlimited (represented as -1 or undefined)
      maxPages: -1,
      maxCollections: -1,
      maxContentTypes: -1,
      maxMediaFiles: -1,
      maxStorageMB: -1,
      maxUsers: -1,
      maxWebhooks: -1,
      maxApiRequestsPerMonth: -1,
    },
  },
  // Alias for professional (Tenant uses 'professional', Subscription uses 'PRO')
  [Plan.PROFESSIONAL]: {
    name: 'Professional',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'snapshots',
      'media_manager',
      'media_transformations',
      'cdn_integration',
      'seo_settings',
      'seo_analytics',
      'sitemap_generation',
      'custom_domains',
      'ssl_certificates',
      'environment_deployment',
      'backup_restore',
      'webhooks',
      'api_access',
      'graphql_api',
      'third_party_integrations',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
      'payments',
      'shop',
      'analytics',
      'meta-pixel',
      'tag-manager',
    ],
    limits: {
      maxPages: 500,
      maxCollections: 100,
      maxContentTypes: 200,
      maxMediaFiles: 5000,
      maxStorageMB: 10000,
      maxUsers: 25,
      maxWebhooks: 50,
      maxApiRequestsPerMonth: 100000,
    },
  },
  // Alias for Subscription plan names (BASIC, PRO)
  'BASIC': {
    name: 'Basic',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'media_manager',
      'media_transformations',
      'seo_settings',
      'sitemap_generation',
      'environment_deployment',
      'webhooks',
      'api_access',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
    ],
    limits: {
      maxPages: 50,
      maxCollections: 10,
      maxContentTypes: 20,
      maxMediaFiles: 500,
      maxStorageMB: 1000,
      maxUsers: 5,
      maxWebhooks: 10,
      maxApiRequestsPerMonth: 10000,
    },
  },
  'PRO': {
    name: 'Pro',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'snapshots',
      'media_manager',
      'media_transformations',
      'cdn_integration',
      'seo_settings',
      'seo_analytics',
      'sitemap_generation',
      'custom_domains',
      'ssl_certificates',
      'environment_deployment',
      'backup_restore',
      'webhooks',
      'api_access',
      'graphql_api',
      'third_party_integrations',
      'consent-security',
      'forms-pro',
      'embeds-media',
      'maps',
      'blog-content',
      'accessibility-widget',
      'payments',
      'shop',
      'analytics',
      'meta-pixel',
      'tag-manager',
    ],
    limits: {
      maxPages: 500,
      maxCollections: 100,
      maxContentTypes: 200,
      maxMediaFiles: 5000,
      maxStorageMB: 10000,
      maxUsers: 25,
      maxWebhooks: 50,
      maxApiRequestsPerMonth: 100000,
    },
  },
};

/**
 * Get plan configuration
 */
export function getPlanConfig(plan: string): PlanConfig | undefined {
  return PLANS[plan as Plan];
}

/**
 * Get features for a plan
 */
export function getPlanFeatures(plan: string): string[] {
  const config = getPlanConfig(plan);
  return config?.features || [];
}

/**
 * Get limits for a plan
 */
export function getPlanLimits(plan: string): PlanLimits | undefined {
  const config = getPlanConfig(plan);
  return config?.limits;
}

/**
 * Check if a feature is included in a plan
 */
export function isFeatureInPlan(plan: string, featureKey: string): boolean {
  const features = getPlanFeatures(plan);
  return features.includes(featureKey);
}

/**
 * Validate plan name
 * Supports both Tenant plan names (free, professional, enterprise) and Subscription plan names (BASIC, PRO)
 */
export function isValidPlan(plan: string): boolean {
  const validPlans = [
    Plan.FREE,
    Plan.BASIC,
    Plan.PROFESSIONAL,
    Plan.PRO,
    Plan.ENTERPRISE,
    'BASIC',
    'PRO',
  ];
  return validPlans.includes(plan);
}

