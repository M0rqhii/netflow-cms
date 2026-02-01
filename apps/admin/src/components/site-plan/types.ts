import type { PlanLimits } from '@repo/schemas';

export type SitePlanLimits = PlanLimits | {
  maxPages?: number;
  maxCollections?: number;
  maxContentTypes?: number;
  maxMediaFiles?: number;
  maxStorageMB?: number;
  maxUsers?: number;
  maxWebhooks?: number;
  maxApiRequestsPerMonth?: number;
};

export type SiteFeatureOverride = {
  featureKey: string;
  enabled: boolean;
  createdAt: string;
};

export type SiteFeaturesResponse = {
  plan: string;
  planFeatures: string[];
  overrides: SiteFeatureOverride[];
  effective: string[];
  limits?: SitePlanLimits;
};

export type FeatureMatrixRow = {
  key: string;
  name: string;
  description: string;
  inPlan: boolean;
  overrideState: boolean | null;
  effective: boolean;
  experimental?: boolean;
};

export type UsageStats = {
  pages: number;
  media: number;
};
