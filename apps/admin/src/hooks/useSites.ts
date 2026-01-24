"use client";

import { useEffect, useState, useRef } from 'react';
import { fetchMySites } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';

// Shared cache for all components
let globalSitesCache: SiteInfo[] | null = null;
let globalSitesPromise: Promise<SiteInfo[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30000; // 30 seconds

export function clearSitesCache() {
  globalSitesCache = null;
  globalSitesPromise = null;
  cacheTimestamp = 0;
}

export async function loadSitesWithCache(): Promise<SiteInfo[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (globalSitesCache && (now - cacheTimestamp) < CACHE_TTL) {
    const validCached = globalSitesCache.filter(s => s?.site != null);
    if (validCached.length !== globalSitesCache.length) {
      globalSitesCache = validCached;
    }
    return globalSitesCache;
  }

  // If there's already a pending request, return that promise
  if (globalSitesPromise) {
    return globalSitesPromise;
  }

  // Create new request
  globalSitesPromise = fetchMySites()
    .then((data) => {
      const validSites = data.filter(s => s?.site != null);
      globalSitesCache = validSites;
      cacheTimestamp = Date.now();
      globalSitesPromise = null;
      return validSites;
    })
    .catch((error) => {
      globalSitesPromise = null;
      throw error;
    });

  return globalSitesPromise;
}

/**
 * Hook to fetch sites with shared cache across all components
 * Prevents multiple simultaneous requests to /api/v1/sites
 */
export function useSites() {
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    loadSitesWithCache()
      .then((data) => {
        if (mountedRef.current) {
          setSites(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load sites'));
          setSites([]);
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { sites, loading, error, refetch: clearSitesCache };
}
