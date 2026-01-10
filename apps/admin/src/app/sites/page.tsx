"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMySites } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';

let sitesCache: SiteInfo[] | null = null;
let sitesPromise: Promise<SiteInfo[]> | null = null;

// Function to clear cache (useful for debugging)
export function clearSitesCache() {
  sitesCache = null;
  sitesPromise = null;
}

async function loadSites(): Promise<SiteInfo[]> {
  if (sitesCache) {
    // Filter cache to ensure no invalid sites (handles stale cache data)
    const validCached = sitesCache.filter(s => s?.site != null);
    if (validCached.length !== sitesCache.length) {
      sitesCache = validCached;
    }
    return sitesCache;
  }
  if (!sitesPromise) {
    sitesPromise = fetchMySites()
      .then((data) => {
        // Debug: log all sites to see what we're getting
        console.log('[SitesPage] All sites from API:', data);
        console.log('[SitesPage] Sites with site property:', data.filter(s => s?.site != null));
        console.log('[SitesPage] Sites without site property:', data.filter(s => !s?.site || s?.site == null));
        
        // Filter out any sites with missing site property to prevent runtime errors
        const validSites = data.filter(s => s?.site != null);
        sitesCache = validSites;
        return validSites;
      })
      .catch((error) => {
        sitesPromise = null;
        throw error;
      });
  }
  return sitesPromise;
}

export default function SitesPage() {
  const t = useTranslations();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const { push } = useToast();

  useEffect(() => {
    let isMounted = true;

    // Clear cache on mount to ensure fresh data
    clearSitesCache();

    loadSites()
      .then((data) => {
        if (!isMounted) return;
        // Double-check: filter out any sites with missing site property
        const validSites = data.filter(s => s?.site != null);
        console.log('[SitesPage] Setting sites:', validSites);
        setSites(validSites);
      })
      .catch((error) => {
        if (!isMounted) return;
        push({
          tone: 'error',
          message: error instanceof Error ? error.message : t('sitesList.failedToLoadSites'),
        });
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [push, t]);

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const plan = planFilter.toLowerCase();

    return sites
      .filter(site => {
        // Ensure site and site.site exist and are valid
        if (!site || !site.site || typeof site.site !== 'object') return false;
        const siteData = site.site;
        const matchesSearch =
          !query ||
          siteData.name?.toLowerCase().includes(query) ||
          siteData.slug?.toLowerCase().includes(query);
        const sitePlan = (siteData.plan || 'free').toLowerCase();
        const matchesPlan = plan === 'all' || sitePlan === plan;
        return matchesSearch && matchesPlan;
      })
      .sort((a, b) => {
        if (!a?.site?.name || !b?.site?.name) return 0;
        return a.site.name.localeCompare(b.site.name);
      });
  }, [planFilter, searchQuery, sites]);

  const getPlanBadgeColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'professional':
      case 'pro':
        return 'blue';
      case 'enterprise':
        return 'purple';
      case 'free':
      case 'basic':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
                {t('sitesList.title')}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted">
                {t('sitesList.manageAllSites')}
              </p>
            </div>
            <Link href="/sites/new">
              <Button variant="primary" className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                + {t('sitesList.newSite')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                <Input
                  placeholder={t('sitesList.searchSitesByNameOrSlug')}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="flex-1 w-full sm:min-w-[180px] text-[10px] sm:text-xs h-8 sm:h-9"
                />
                <select
                  className="border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs h-8 sm:h-9 bg-card text-foreground w-full sm:w-auto"
                  value={planFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlanFilter(e.target.value)}
                >
                  <option value="all">{t('sitesList.allPlans')}</option>
                  <option value="free">{t('dashboard.free')}</option>
                  <option value="basic">{t('sitesList.basic')}</option>
                  <option value="professional">{t('dashboard.professional')}</option>
                  <option value="pro">{t('sitesList.pro')}</option>
                  <option value="enterprise">{t('dashboard.enterprise')}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Sites List */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">
                {loading ? t('sitesList.loading') : `${filteredSites.length} ${filteredSites.length === 1 ? t('sitesList.site') : t('sitesList.sites')}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              {loading ? (
                <div className="py-8">
                  <LoadingSpinner text={t('sitesList.loadingSites')} />
                </div>
              ) : filteredSites.length === 0 ? (
                <EmptyState
                  title={searchQuery || planFilter !== 'all' ? t('sitesList.noSitesFound') : t('sitesList.noSitesYet')}
                  description={
                    searchQuery || planFilter !== 'all'
                      ? t('sitesList.tryAdjustingSearch')
                      : t('sitesList.createFirstSiteToGetStarted')
                  }
                  action={
                    !searchQuery && planFilter === 'all'
                      ? {
                          label: t('sitesList.createSite'),
                          onClick: () => window.location.href = '/sites/new',
                        }
                      : undefined
                  }
                />
              ) : (
                <>
                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('sitesList.sitesTable')}</caption>
                      <thead>
                        <tr className="text-left text-muted border-b border-border">
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('sitesList.name')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('sitesList.slug')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('sitesList.plan')}</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('sitesList.yourRole')}</th>
                          <th scope="col" className="text-right py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('sitesList.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSites.map((site) => {
                          if (!site?.site?.slug) return null;
                          return (
                            <tr key={site.siteId} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-xs sm:text-sm">{site.site.name}</div>
                              </td>
                              <td className="py-2 px-3">
                                <code className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{site.site.slug}</code>
                              </td>
                              <td className="py-2 px-3">
                                <Badge color={getPlanBadgeColor(site.site.plan)} className="text-[9px] sm:text-[10px]">
                                  {site.site.plan || 'free'}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <Badge className="text-[9px] sm:text-[10px]">{site.role}</Badge>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <Link href={`/sites/${site.site.slug}`}>
                                    <Button variant="primary" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">{t('sitesList.view')}</Button>
                                  </Link>
                                  <Link href={`/sites/${site.site.slug}/users`}>
                                    <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">{t('sitesList.users')}</Button>
                                  </Link>
                                  <Link href={`/sites/${site.site.slug}/billing`}>
                                    <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2">{t('sitesList.billing')}</Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card view */}
                  <div className="md:hidden space-y-2">
                    {filteredSites.map((site) => {
                      if (!site?.site?.slug) return null;
                      return (
                        <Link
                          key={site.siteId}
                          href={`/sites/${site.site.slug}`}
                          className="block border border-border rounded-lg p-2 sm:p-3 hover:border-primary/50 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="space-y-1.5 sm:space-y-2">
                            <div>
                              <div className="text-[10px] text-muted mb-0.5">{t('sitesList.name')}</div>
                              <div className="font-semibold text-xs sm:text-sm">{site.site.name}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted mb-0.5">{t('sitesList.slug')}</div>
                              <code className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{site.site.slug}</code>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div>
                                <div className="text-[10px] text-muted mb-0.5">{t('sitesList.plan')}</div>
                                <Badge color={getPlanBadgeColor(site.site.plan)} className="text-[9px] sm:text-[10px]">
                                  {site.site.plan || 'free'}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-[10px] text-muted mb-0.5">{t('sitesList.yourRole')}</div>
                                <Badge className="text-[9px] sm:text-[10px]">{site.role}</Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
