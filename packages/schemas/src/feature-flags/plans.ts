/**
 * Plans Configuration - Mapping plans to features and limits
 * 4 tiers: free, pro, max, enterprise
 */

import { getAllFeatureKeys } from './features';

export enum Plan {
  FREE = 'free',
  PRO = 'pro',
  MAX = 'max',
  ENTERPRISE = 'enterprise',
}

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

export interface PlanConfig {
  name: string;
  features: string[];
  limits?: PlanLimits;
}

export const PLANS: Record<string, PlanConfig> = {
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
  [Plan.PRO]: {
    name: 'Pro',
    features: [
      'page_builder',
      'content_editor',
      'collections',
      'content_workflow',
      'content_versioning',
      'media_manager',
      'media_transformations',
      'seo_settings',
      'seo_analytics',
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
      'analytics',
    ],
    limits: {
      maxPages: 50,
      maxCollections: 15,
      maxContentTypes: 30,
      maxMediaFiles: 500,
      maxStorageMB: 1000,
      maxUsers: 5,
      maxWebhooks: 10,
      maxApiRequestsPerMonth: 25000,
    },
  },
  [Plan.MAX]: {
    name: 'Max',
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
    features: getAllFeatureKeys(),
    limits: {
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
};

export function getPlanConfig(plan: string): PlanConfig | undefined {
  return PLANS[plan as Plan];
}

export function getPlanFeatures(plan: string): string[] {
  const config = getPlanConfig(plan);
  return config?.features || [];
}

export function getPlanLimits(plan: string): PlanLimits | undefined {
  const config = getPlanConfig(plan);
  return config?.limits;
}

export function isFeatureInPlan(plan: string, featureKey: string): boolean {
  const features = getPlanFeatures(plan);
  return features.includes(featureKey);
}

export function isValidPlan(plan: string): boolean {
  const validPlans: string[] = [Plan.FREE, Plan.PRO, Plan.MAX, Plan.ENTERPRISE];
  return validPlans.includes(plan);
}
