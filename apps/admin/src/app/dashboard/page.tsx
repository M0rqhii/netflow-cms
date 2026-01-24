"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import type { SiteInfo } from '@repo/sdk';
import { fetchMySites, fetchActivity, fetchQuickStats, type ActivityItem, type QuickStats } from '@/lib/api';
import { dismissOnboarding, markOnboardingSeenThisSession, shouldShowOnboarding } from '@/lib/onboarding';
import { useTranslations } from '@/hooks/useTranslations';
import { decodeAuthToken, getAuthToken } from '@/lib/api';

// Icon components
const StatIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    sites: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    active: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    total: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    collections: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    media: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  };
  return icons[icon] || null;
};

const ActivityIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    create: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    update: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    delete: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  };
  return icons[type] || (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export default function DashboardPage() {
  const t = useTranslations();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [stats, setStats] = useState<QuickStats>({ sites: 0, collections: 0, media: 0, users: 0, active: 0, total: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'plan'>('none');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null); // null = all sites

  const userInfo = useMemo(() => {
    const token = getAuthToken();
    return token ? decodeAuthToken(token) : null;
  }, []);
  const userEmail = userInfo?.email || 'user@example.com';
  const userOrgId = userInfo?.orgId || null;

  useEffect(() => {
    const checkOnboarding = () => {
      const shouldShow = shouldShowOnboarding();
      setShowOnboarding(shouldShow);
      if (shouldShow) {
        markOnboardingSeenThisSession();
      }
    };

    checkOnboarding();
    const handleShow = () => checkOnboarding();
    window.addEventListener('onboarding:show', handleShow);
    return () => window.removeEventListener('onboarding:show', handleShow);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setStatsLoading(true);
      setActivityLoading(true);
      setSitesError(null);
      setStatsError(null);
      setActivityError(null);

      try {
        const [sitesData, quickStats] = await Promise.allSettled([
          fetchMySites(),
          fetchQuickStats(),
        ]);

        if (sitesData.status === 'fulfilled') {
          // Filter out any sites with missing site property to prevent runtime errors
          const validSites = sitesData.value.filter(s => s?.site != null);
          setSites(validSites);
          
          // Fetch activity for the current org (if available)
          const resolvedOrgId = userOrgId || undefined;
          await loadActivity(resolvedOrgId, selectedSiteId);
        } else {
          setSitesError(sitesData.reason instanceof Error ? sitesData.reason.message : t('dashboard.failedToLoad'));
          setSites([]);
        }

        if (quickStats.status === 'fulfilled') {
          setStats(quickStats.value);
        } else {
          setStatsError(quickStats.reason instanceof Error ? quickStats.reason.message : t('errors.failedToLoad'));
          setStats({ sites: 0, collections: 0, media: 0, users: 0, active: 0, total: 0 });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('errors.failedToLoad');
        setSitesError(errorMessage);
        setStatsError(errorMessage);
        setActivityError(errorMessage);
      } finally {
        setLoading(false);
        setStatsLoading(false);
        setActivityLoading(false);
      }
    };

    loadData();
  }, [t]);

  // Load activity when selectedSiteId changes

  useEffect(() => {
    if (userOrgId) {
      loadActivity(userOrgId, selectedSiteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, userOrgId]);

  const loadActivity = async (orgId: string | undefined, siteId: string | null) => {
    if (!orgId) return;
    
    setActivityLoading(true);
    setActivityError(null);
    
    try {
      const activityData = await Promise.allSettled([
        fetchActivity(10, orgId, siteId || undefined),
      ]);

      if (activityData[0].status === 'fulfilled') {
        setActivity(activityData[0].value);
      } else {
        setActivityError(activityData[0].reason instanceof Error ? activityData[0].reason.message : t('errors.failedToLoad'));
        setActivity([]);
      }
    } catch (error) {
      setActivityError(error instanceof Error ? error.message : t('errors.failedToLoad'));
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      if (!site?.site) return false;
      const matchesSearch = !searchQuery || 
        site.site.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        site.site.slug?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === 'all' || site.site?.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [sites, searchQuery, planFilter]);

  const groupedSites = useMemo(() => {
    if (groupBy !== 'plan') return null;
    return filteredSites.reduce((acc, site) => {
      if (!site?.site) return acc;
      const plan = site.site.plan || 'free';
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(site);
      return acc;
    }, {} as Record<string, typeof filteredSites>);
  }, [filteredSites, groupBy]);


  const statCards = [
    { key: 'sites', label: t('dashboard.totalSites'), value: stats.sites, icon: 'sites', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
    { key: 'users', label: t('dashboard.users'), value: stats.users, icon: 'users', color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { key: 'active', label: t('dashboard.active'), value: stats.active ?? 0, icon: 'active', color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-50 dark:bg-purple-950/20' },
    { key: 'collections', label: t('dashboard.collections'), value: stats.collections, icon: 'collections', color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-50 dark:bg-amber-950/20' },
    { key: 'media', label: t('dashboard.media'), value: stats.media, icon: 'media', color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/20' },
    { key: 'total', label: t('dashboard.total'), value: stats.total ?? stats.sites, icon: 'total', color: 'from-violet-500 to-purple-500', bgColor: 'bg-violet-50 dark:bg-violet-950/20' },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted text-[10px] sm:text-xs">
            {t('dashboard.welcomeBack')}, {userEmail}
          </p>
        </div>

        {/* Alert Banners */}
        {showOnboarding && (
          <div className="mb-2 sm:mb-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-0.5">
                  Szybki start
                </h3>
                <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                  To centrum dowodzenia stronami. Utwórz stronę lub wejdź do panelu, aby zacząć.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link href="/sites/new" className="flex-1 sm:flex-none">
                  <Button variant="primary" size="sm" className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">Utwórz stronę</Button>
                </Link>
                {sites.length > 0 && sites[0]?.site?.slug && (
                  <Link href={`/sites/${encodeURIComponent(sites[0].site.slug)}/panel`} className="hidden sm:block">
                    <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">Wejdź do panelu</Button>
                  </Link>
                )}
                <button
                  type="button"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-0.5 flex-shrink-0"
                  onClick={() => {
                    dismissOnboarding();
                    setShowOnboarding(false);
                  }}
                  aria-label="Zamknij"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-2 sm:mb-3">
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <Skeleton variant="rectangular" width={28} height={28} className="rounded-lg flex-shrink-0" />
                      <Skeleton variant="text" width={32} height={16} />
                    </div>
                    <Skeleton variant="text" width={48} height={9} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : statsError ? (
            <Card>
              <CardContent className="p-2 sm:p-3 text-center text-red-600 dark:text-red-400 text-[10px] sm:text-xs">
                {statsError}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-1.5 sm:gap-2">
              {statCards.map((stat) => (
                <Card key={stat.key} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <div className={`${stat.bgColor} w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <div className={`bg-gradient-to-br ${stat.color} p-0.5 sm:p-1 rounded-lg`}>
                          <StatIcon icon={stat.icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-foreground">
                        {stat.value.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {/* Sites Overview - Takes 2 columns */}
          <div className="lg:col-span-2 flex">
            <Card className="border-0 shadow-sm w-full flex flex-col">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.sitesOverview')}</CardTitle>
                    <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">Zarządzaj wszystkimi swoimi stronami</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Link href="/sites/new" className="flex-1 sm:flex-none">
                      <Button variant="primary" size="sm" className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">+ {t('dashboard.new')}</Button>
                    </Link>
                    <Link href="/sites" className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">{t('dashboard.viewAll')}</Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {/* Filters */}
                <div className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                  <Input
                    placeholder={t('dashboard.searchSites')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 w-full sm:min-w-[180px] text-[10px] sm:text-xs h-8 sm:h-9"
                  />
                  <select
                    className="border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs h-8 sm:h-9 bg-card text-foreground w-full sm:w-auto"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                  >
                    <option value="all">{t('dashboard.allPlans')}</option>
                    <option value="free">{t('dashboard.free')}</option>
                    <option value="professional">{t('dashboard.professional')}</option>
                    <option value="enterprise">{t('dashboard.enterprise')}</option>
                  </select>
                  <select
                    className="border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs h-8 sm:h-9 bg-card text-foreground w-full sm:w-auto"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'plan')}
                  >
                    <option value="none">{t('dashboard.noGrouping')}</option>
                    <option value="plan">{t('dashboard.groupByPlan')}</option>
                  </select>
                </div>

                {loading ? (
                  <div className="py-8">
                    <LoadingSpinner text={t('common.loading')} />
                  </div>
                ) : sitesError ? (
                  <div className="py-8 text-center text-red-600 dark:text-red-400 text-sm">
                    {sitesError}
                  </div>
                ) : filteredSites.length === 0 && sites.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="Nie masz jeszcze żadnych stron"
                      description="Utwórz pierwszą stronę, aby rozpocząć"
                      action={{
                        label: "Utwórz pierwszą stronę",
                        onClick: () => window.location.href = '/sites/new',
                      }}
                    />
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="py-8 text-center text-muted text-sm">
                    {t('dashboard.noSites')}
                  </div>
                ) : groupBy === 'plan' && groupedSites ? (
                  <div className="space-y-3">
                    {Object.entries(groupedSites).map(([plan, sites]) => (
                      <div key={plan}>
                        <h3 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 capitalize text-foreground">{plan} ({sites.length})</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {sites.slice(0, 3).map((site) => {
                            if (!site?.site?.slug) return null;
                            return (
                              <Link
                                key={site.siteId}
                                href={`/sites/${site.site.slug}`}
                                className="block border border-border rounded-lg p-2 sm:p-3 hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                      {site.site.name}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-muted mt-0.5 truncate">{site.site.slug}</div>
                                    <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5">
                                      <Badge className="text-[9px] sm:text-[10px]">{t('sites.plan')}: {site.site.plan || 'free'}</Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:flex-shrink-0">
                                    <Button variant="outline" size="sm" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs h-7 sm:h-8 px-2 w-full sm:w-auto">
                                      {t('common.view')}
                                    </Button>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {filteredSites.slice(0, 5).map((site) => {
                      if (!site?.site?.slug) return null;
                      return (
                        <Link
                          key={site.siteId}
                          href={`/sites/${site.site.slug}`}
                          className="block border border-border rounded-lg p-2 sm:p-3 hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {site.site.name}
                              </div>
                              <div className="text-[10px] sm:text-xs text-muted mt-0.5 truncate">{site.site.slug}</div>
                              <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5">
                                <Badge className="text-[9px] sm:text-[10px]">{t('sites.plan')}: {site.site.plan || 'free'}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:flex-shrink-0">
                              <Button variant="outline" size="sm" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] sm:text-xs h-7 sm:h-8 px-2 w-full sm:w-auto">
                                {t('common.view')}
                              </Button>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Takes 1 column */}
          <div className="flex">
            <Card className="border-0 shadow-sm w-full flex flex-col">
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.quickActions')}</CardTitle>
                <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">Szybki dostęp do najczęstszych akcji</p>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 flex-1 flex flex-col">
                <div className="space-y-1.5 flex-1">
                  <Link href="/sites/new" className="block">
                    <Button variant="primary" className="w-full justify-start text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                      <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="truncate">{t('dashboard.createSite')}</span>
                    </Button>
                  </Link>
                  
                  <Tooltip content={sites.length === 0 ? "Utwórz pierwszą stronę, aby zobaczyć listę" : undefined}>
                    <Link href="/sites" className={sites.length === 0 ? "pointer-events-none block" : "block"}>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-[10px] sm:text-xs h-7 sm:h-8 px-2" 
                        disabled={sites.length === 0}
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="truncate">{t('dashboard.viewAllSites')}</span>
                      </Button>
                    </Link>
                  </Tooltip>
                  
                  {userOrgId && (
                    <Link href={`/org/${userOrgId}/settings/general`} className="block">
                      <Button variant="outline" className="w-full justify-start text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{t('navigation.orgSettings')}</span>
                      </Button>
                    </Link>
                  )}
                  
                  <Tooltip content={sites.length === 0 ? "Utwórz pierwszą stronę, aby zarządzać płatnościami" : undefined}>
                    <Link href="/billing" className={sites.length === 0 ? "pointer-events-none block" : "block"}>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-[10px] sm:text-xs h-7 sm:h-8 px-2" 
                        disabled={sites.length === 0}
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="truncate">{t('navigation.billing')}</span>
                      </Button>
                    </Link>
                  </Tooltip>
                  
                  <Link href="/account" className="block">
                    <Button variant="outline" className="w-full justify-start text-[10px] sm:text-xs h-7 sm:h-8 px-2">
                      <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{t('navigation.account')}</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base font-semibold">{t('dashboard.recentActivity')}</CardTitle>
                <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">Ostatnie działania w systemie</p>
              </div>
              {sites.length > 1 && (
                <select
                  className="border rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs h-8 sm:h-9 bg-card text-foreground flex-shrink-0"
                  value={selectedSiteId || 'all'}
                  onChange={(e) => setSelectedSiteId(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">Wszystkie sites</option>
                  {sites.map((site) => {
                    if (!site?.site) return null;
                    return (
                      <option key={site.siteId} value={site.site.id}>
                        {site.site.name}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            {activityLoading ? (
              <ul className="space-y-1.5 sm:space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5">
                    <Skeleton variant="text" width={140} height={12} className="sm:w-40" />
                    <Skeleton variant="text" width={56} height={10} className="sm:w-20" />
                  </li>
                ))}
              </ul>
            ) : activityError ? (
              <div className="text-center py-3 text-red-600 dark:text-red-400 text-[10px] sm:text-xs">
                {activityError}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                title={t('dashboard.noRecentActivity')}
                description={t('dashboard.activityWillAppear')}
              />
            ) : (
              <ul className="space-y-1.5 sm:space-y-2">
                {activity.map((item) => {
                  const activityType = item.message.toLowerCase().includes('created') ? 'create' :
                                     item.message.toLowerCase().includes('updated') ? 'update' :
                                     item.message.toLowerCase().includes('deleted') ? 'delete' : 'default';
                  return (
                    <li key={item.id} className="flex items-start sm:items-center justify-between gap-1.5 sm:gap-3 py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <ActivityIcon type={activityType} />
                        </div>
                        <span className="text-[10px] sm:text-xs text-foreground truncate">{item.message}</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-muted whitespace-nowrap flex-shrink-0">
                        {new Date(item.createdAt).toLocaleString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
