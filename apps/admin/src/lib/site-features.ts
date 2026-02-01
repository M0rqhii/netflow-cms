"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient } from '@repo/sdk';
import type { PlanLimits } from '@repo/schemas';
import { exchangeSiteToken, getSiteToken } from '@/lib/api';

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

async function ensureSiteToken(siteId: string): Promise<string> {
  const cached = getSiteToken(siteId);
  if (cached) return cached;
  return exchangeSiteToken(siteId);
}

export async function fetchSiteFeatures(siteId: string): Promise<SiteFeaturesResponse> {
  const token = await ensureSiteToken(siteId);
  const apiClient = createApiClient();
  return apiClient.getSiteFeatures(token, siteId) as Promise<SiteFeaturesResponse>;
}

export async function setSiteFeatureOverride(
  siteId: string,
  featureKey: string,
  enabled: boolean
): Promise<SiteFeatureOverride> {
  const token = await ensureSiteToken(siteId);
  const apiClient = createApiClient();
  return apiClient.setFeatureOverride(token, siteId, featureKey, enabled);
}

export function useSiteFeatures(siteId?: string | null) {
  const apiClient = useMemo(() => createApiClient(), []);
  const [features, setFeatures] = useState<SiteFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await ensureSiteToken(siteId);
      const response = await apiClient.getSiteFeatures(token, siteId);
      setFeatures(response as SiteFeaturesResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site features');
    } finally {
      setLoading(false);
    }
  }, [apiClient, siteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateOverride = useCallback(
    async (featureKey: string, enabled: boolean) => {
      if (!siteId) return null;
      setLoading(true);
      setError(null);
      try {
        const token = await ensureSiteToken(siteId);
        const result = await apiClient.setFeatureOverride(token, siteId, featureKey, enabled);
        await refresh();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update feature override');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, refresh, siteId]
  );

  const isEnabled = useCallback(
    (featureKey: string) => features?.effective?.includes(featureKey) ?? false,
    [features]
  );

  const isInPlan = useCallback(
    (featureKey: string) => features?.planFeatures?.includes(featureKey) ?? false,
    [features]
  );

  return {
    features,
    loading,
    error,
    refresh,
    updateOverride,
    isEnabled,
    isInPlan,
  };
}

export default useSiteFeatures;
