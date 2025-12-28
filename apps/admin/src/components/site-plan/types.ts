import type { PlanLimits } from '@repo/schemas';

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
  limits?: PlanLimits;
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
