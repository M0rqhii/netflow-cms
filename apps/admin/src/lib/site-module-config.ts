"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient } from '@repo/sdk';
import { exchangeSiteToken, getSiteToken } from '@/lib/api';

async function ensureSiteToken(siteId: string): Promise<string> {
  const cached = getSiteToken(siteId);
  if (cached) return cached;
  return exchangeSiteToken(siteId);
}

export type SiteModuleConfigState = {
  modules: Record<string, Record<string, unknown>>;
};

export function useSiteModuleConfig(siteId?: string | null) {
  const apiClient = useMemo(() => createApiClient(), []);
  const [config, setConfig] = useState<SiteModuleConfigState>({ modules: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await ensureSiteToken(siteId);
      const response = await apiClient.getSiteModuleConfig(token, siteId);
      setConfig(response as SiteModuleConfigState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module config');
    } finally {
      setLoading(false);
    }
  }, [apiClient, siteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateModuleConfig = useCallback(
    async (moduleKey: string, nextConfig: Record<string, unknown>) => {
      if (!siteId) return null;
      setLoading(true);
      setError(null);
      try {
        const token = await ensureSiteToken(siteId);
        const response = await apiClient.updateSiteModuleConfig(token, siteId, moduleKey, nextConfig);
        setConfig(response as SiteModuleConfigState);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update module config');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, siteId]
  );

  return {
    config,
    loading,
    error,
    refresh,
    updateModuleConfig,
  };
}

export default useSiteModuleConfig;
