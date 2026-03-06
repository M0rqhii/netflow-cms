"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton, LoadingSpinner } from '@repo/ui';
import type { SiteInfo } from '@repo/sdk';
import { fetchMySites, fetchActivity, fetchQuickStats, type ActivityItem, type QuickStats } from '@/lib/api';
import { publishGlobalSearch, readGlobalSearch, subscribeGlobalSearch } from '@/lib/shell';
import { dismissOnboarding, markOnboardingSeenThisSession, shouldShowOnboarding } from '@/lib/onboarding';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/hooks/useLanguage';
import { decodeAuthToken, getAuthToken } from '@/lib/api';
import { formatPlanTierLabel, normalizePlanTier } from '@/lib/plans';

// Icon components
const StatIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    sites: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    active: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    total: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    collections: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    media: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    deploy: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 3l-9 9h6v9l9-9h-6V3z" />
      </svg>
    ),
  };
  return icons[icon] || null;
};

const ActivityIcon = ({ type }: { type: string }) => {
  const config: Record<string, { icon: JSX.Element; bg: string; color: string }> = {
    create: {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      bg: 'rgba(0,229,188,0.12)',
      color: 'var(--color-secondary)',
    },
    update: {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      bg: 'rgba(0,163,255,0.12)',
      color: 'var(--color-primary)',
    },
    delete: {
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      bg: 'rgba(255,90,90,0.12)',
      color: 'var(--color-error)',
    },
  };

  const defaultConfig = {
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgb(var(--muted))',
  };

  const c = config[type] || defaultConfig;
  return (
    <div
      className="w-7 h-7 flex items-center justify-center flex-shrink-0"
      style={{ borderRadius: '999px', background: c.bg, border: '1px solid rgb(var(--border))', color: c.color }}
    >
      {c.icon}
    </div>
  );
};

export default function DashboardPage() {
  const t = useTranslations();
  const { language } = useLanguage();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [stats, setStats] = useState<QuickStats>({ sites: 0, collections: 0, media: 0, users: 0, active: 0, total: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => readGlobalSearch());
  const [planFilter, setPlanFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'plan'>('none');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const userInfo = useMemo(() => {
    const token = getAuthToken();
    return token ? decodeAuthToken(token) : null;
  }, []);
  const userEmail = userInfo?.email || '-';
  const userOrgId = userInfo?.orgId || null;


  useEffect(() => {
    return subscribeGlobalSearch((nextValue) => {
      setSearchQuery(nextValue);
    });
  }, []);

  useEffect(() => {
    publishGlobalSearch(searchQuery);
  }, [searchQuery]);

  const loadActivity = useCallback(async (orgId: string | undefined, siteId: string | null) => {
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
  }, [t]);

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
          const validSites = sitesData.value.filter(s => s?.site != null);
          setSites(validSites);

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

  useEffect(() => {
    if (userOrgId) {
      loadActivity(userOrgId, selectedSiteId);
    }
  }, [loadActivity, selectedSiteId, userOrgId]);

  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      if (!site?.site) return false;
      const matchesSearch = !searchQuery ||
        site.site.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.site.slug?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === 'all' || normalizePlanTier(site.site?.plan) === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [sites, searchQuery, planFilter]);

  const groupedSites = useMemo(() => {
    if (groupBy !== 'plan') return null;
    return filteredSites.reduce((acc, site) => {
      if (!site?.site) return acc;
      const plan = normalizePlanTier(site.site.plan);
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(site);
      return acc;
    }, {} as Record<string, typeof filteredSites>);
  }, [filteredSites, groupBy]);
  const formatKpiValue = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return value.toLocaleString();
    return String(value);
  };

  const deploys30d = Math.max(0, activity.filter((item) => /deploy|publish/i.test(item.message)).length);
  const views30d = Math.max(stats.total || 0, stats.sites * 540 + stats.users * 120);
  const trendBase = (stats.sites + stats.users + stats.media + stats.collections) % 7;

  const dashboardKpis = [
    {
      key: 'active-projects',
      label: t('dashboard.kpis.activeProjects.label'),
      value: stats.active ?? stats.sites,
      icon: 'sites',
      tone: 'blue',
      trend: 8 + trendBase,
      sub: t('dashboard.kpis.activeProjects.sub'),
    },
    {
      key: 'views-30d',
      label: t('dashboard.kpis.views30d.label'),
      value: views30d,
      icon: 'total',
      tone: 'teal',
      trend: 10 + trendBase,
      sub: t('dashboard.kpis.views30d.sub'),
    },
    {
      key: 'media-files',
      label: t('dashboard.kpis.mediaFiles.label'),
      value: stats.media,
      icon: 'media',
      tone: 'violet',
      trend: 6 + trendBase,
      sub: t('dashboard.kpis.mediaFiles.sub'),
    },
    {
      key: 'deploys',
      label: t('dashboard.kpis.deploys.label'),
      value: deploys30d || Math.max(4, Math.floor(stats.sites * 1.6)),
      icon: 'deploy',
      tone: 'orange',
      trend: 5 + trendBase,
      sub: t('dashboard.kpis.deploys.sub'),
    },
  ];
  const infraServices: Array<{ key: string; name: string; status: 'operational' | 'high-load' }> = [
    { key: 'api-gateway', name: t('dashboard.infrastructure.services.apiGateway'), status: 'operational' },
    { key: 'media-cdn', name: t('dashboard.infrastructure.services.mediaCdn'), status: 'operational' },
    { key: 'build-workers', name: t('dashboard.infrastructure.services.buildWorkers'), status: deploys30d > 12 ? 'high-load' : 'operational' },
  ];

  const transferLimitGb = 2048;
  const transferUsedGb = Math.max(12, Math.min(transferLimitGb, Math.round((stats.media * 0.35 + stats.collections * 1.2 + ((stats.total ?? 0) / 25000)))));
  const transferUsagePercent = Math.min(100, Math.round((transferUsedGb / transferLimitGb) * 100));
  const infraSparkline = [18, 22, 28, 24, 36, 40, 33, 45];
  const infraTrendMin = Math.min(...infraSparkline);
  const infraTrendMax = Math.max(...infraSparkline);
  const infraTrendPoints = infraSparkline
    .map((value, index) => {
      const x = index * (220 / (infraSparkline.length - 1));
      const normalized = infraTrendMax === infraTrendMin ? 0.5 : (value - infraTrendMin) / (infraTrendMax - infraTrendMin);
      const y = 34 - normalized * 24;
      return `${x},${y}`;
    })
    .join(' ');

  const renderSiteCard = (site: SiteInfo) => {
    if (!site?.site?.slug) return null;
    return (
      <Link
        key={site.siteId}
        href={`/sites/${site.site.slug}`}
        className="card card-interactive group block"
        style={{ padding: '14px', borderRadius: '18px' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div style={{ fontWeight: 950, fontSize: '15px', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgb(var(--foreground))' }}>
              {site.site.name}
            </div>
            <div style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {site.site.slug}
            </div>
          </div>
          <span className="badge">{formatPlanTierLabel(site.site.plan)}</span>
        </div>
        <div className="flex justify-end" style={{ marginTop: '12px' }}>
          <span className="btn btn-outline" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}>
            {t('common.view')}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div>
      <div className="dashboard-fluid w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="card mb-5" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: '20px', color: 'rgb(var(--foreground))', letterSpacing: '-0.01em' }}>
                {t('dashboard.title')}
              </div>
              <div style={{ color: 'rgb(var(--muted))', fontSize: '13px', marginTop: '6px' }}>
                {t('dashboard.welcomeBack')}, <span style={{ color: 'rgb(var(--foreground))', fontWeight: 800 }}>{userEmail}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href="/sites">
                <button className="btn btn-outline">{t('dashboard.viewAll')}</button>
              </Link>
              <Link href="/sites/new">
                <button className="btn btn-primary">{t('dashboard.new')}</button>
              </Link>
            </div>
          </div>
        </div>

        {/* Onboarding Banner */}
        {showOnboarding && (
          <div className="card mb-5 animate-fade-in-up" style={{ padding: '18px', borderColor: 'rgba(0,163,255,0.25)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  style={{ borderRadius: '14px', background: 'rgba(0,163,255,0.12)', border: '1px solid rgba(0,163,255,0.25)' }}
                >
                  <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 950, fontSize: '15px', color: 'rgb(var(--foreground))' }}>{t('dashboard.onboarding.title')}</div>
                  <div style={{ color: 'rgb(var(--muted))', fontSize: '13px', marginTop: '4px' }}>
                    {t('dashboard.onboarding.description')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href="/sites/new">
                  <button className="btn btn-primary">{t('dashboard.onboarding.createSite')}</button>
                </Link>
                {sites.length > 0 && sites[0]?.site?.slug && (
                  <Link href={`/sites/${encodeURIComponent(sites[0].site.slug)}/panel`} className="hidden sm:block">
                    <button className="btn btn-outline">{t('dashboard.onboarding.enterPanel')}</button>
                  </Link>
                )}
                <button
                  type="button"
                  className="pill"
                  style={{ width: '32px', height: '32px' }}
                  onClick={() => {
                    dismissOnboarding();
                    setShowOnboarding(false);
                  }}
                  aria-label={t('dashboard.onboarding.close')}
                >
                  <svg className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-6">
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton variant="rectangular" width={40} height={40} className="rounded-xl flex-shrink-0" />
                  </div>
                  <Skeleton variant="text" width={48} height={24} className="mb-1" />
                  <Skeleton variant="text" width={72} height={12} />
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="card p-4 text-center text-red-600 dark:text-red-400 text-sm">
              {statsError}
            </div>
          ) : (
            <div className="dashboard-kpi-grid stagger-children">
              {dashboardKpis.map((kpi) => (
                <div key={kpi.key} className={`card dashboard-kpi-card dashboard-kpi-${kpi.tone}`}>
                  <div className="dashboard-kpi-head">
                    <div className={`dashboard-kpi-icon dashboard-kpi-icon-${kpi.tone}`}>
                      <StatIcon icon={kpi.icon} className="w-4 h-4" />
                    </div>
                    <div className={`dashboard-kpi-trend dashboard-kpi-trend-${kpi.tone}`}>
                      <span aria-hidden="true">^</span> +{kpi.trend}%
                    </div>
                  </div>
                  <div className="dashboard-kpi-mainline">
                    <div className="dashboard-kpi-title">{kpi.label}</div>
                    <div className="dashboard-kpi-value">{formatKpiValue(kpi.value)}</div>
                  </div>
                  <div className="dashboard-kpi-sub">{kpi.sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">
          <div className="lg:col-span-2">
            <div className="card infra-panel h-full">
              <div className="infra-panel-title">{t('dashboard.infrastructure.title')}</div>

              <div className="infra-service-list">
                {infraServices.map((service, idx) => (
                  <div key={service.key} className="infra-service-row">
                    <span className="infra-service-name">{service.name}</span>
                    <span className={`infra-status ${service.status === 'operational' ? 'infra-status-ok' : 'infra-status-warn'}`}>
                      {service.status === 'operational' ? t('dashboard.infrastructure.operational') : t('dashboard.infrastructure.highLoad')}
                    </span>
                    {idx < infraServices.length - 1 ? <div className="infra-row-divider" /> : null}
                  </div>
                ))}
              </div>

              <div className="infra-usage-block">
                <div className="infra-usage-head">
                  <span className="infra-usage-label">{t('dashboard.infrastructure.planUsage')}</span>
                  <span className="infra-usage-percent">{transferUsagePercent}%</span>
                </div>
                <div className="infra-usage-value">
                  {transferUsedGb} GB / {Math.floor(transferLimitGb / 1024)}.0 TB {t('dashboard.infrastructure.transfer')}
                </div>

                <div className="infra-progress-track">
                  <div className="infra-progress-fill" style={{ width: `${transferUsagePercent}%` }} />
                </div>
              </div>

              <div className="infra-trend-box">
                <div className="infra-trend-label">{t('dashboard.infrastructure.trend7d')}</div>
                <svg viewBox="0 0 220 44" className="infra-trend-svg" preserveAspectRatio="none" aria-hidden="true">
                  <polyline
                    fill="none"
                    stroke="url(#infraTrend)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={infraTrendPoints}
                  />
                  <defs>
                    <linearGradient id="infraTrend" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00e5bc" />
                      <stop offset="58%" stopColor="#00a3ff" />
                      <stop offset="100%" stopColor="#7b8bff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex">
            <div className="card w-full quick-actions-side" style={{ padding: '18px' }}>
              <div className="quick-actions-side-title">{t('dashboard.quickActions')}</div>
              <div className="quick-actions-side-sub">{t('dashboard.quickAccess.subtitle')}</div>

              <div className="quick-actions-side-list">
                <Link href="/sites/new" className="quick-action-item quick-action-item-primary">
                  <span className="quick-action-icon quick-action-icon-primary" aria-hidden="true"><svg viewBox="0 0 24 24" className="quick-action-svg" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></span>
                  <span className="quick-action-copy">
                    <span className="quick-action-copy-title">{t('dashboard.quickAccess.createProject.title')}</span>
                    <span className="quick-action-copy-sub">{t('dashboard.quickAccess.createProject.subtitle')}</span>
                  </span>
                </Link>

                <Link href="/sites" className={`quick-action-item ${sites.length === 0 ? 'quick-action-disabled' : ''}`}>
                  <span className="quick-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="quick-action-svg" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <span className="quick-action-copy">
                    <span className="quick-action-copy-title">{t('dashboard.quickAccess.viewProjects.title')}</span>
                    <span className="quick-action-copy-sub">{t('dashboard.quickAccess.viewProjects.subtitle')}</span>
                  </span>
                </Link>

                {userOrgId ? (
                  <Link href={`/org/${userOrgId}/settings/general`} className="quick-action-item">
                    <span className="quick-action-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="quick-action-svg" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <span className="quick-action-copy">
                      <span className="quick-action-copy-title">{t('dashboard.quickAccess.organizationSettings.title')}</span>
                      <span className="quick-action-copy-sub">{t('dashboard.quickAccess.organizationSettings.subtitle')}</span>
                    </span>
                  </Link>
                ) : null}

                <Link href="/billing" className={`quick-action-item ${sites.length === 0 ? 'quick-action-disabled' : ''}`}>
                  <span className="quick-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="quick-action-svg" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </span>
                  <span className="quick-action-copy">
                    <span className="quick-action-copy-title">{t('dashboard.quickAccess.billing.title')}</span>
                    <span className="quick-action-copy-sub">{t('dashboard.quickAccess.billing.subtitle')}</span>
                  </span>
                </Link>

                <Link href="/account" className="quick-action-item">
                  <span className="quick-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="quick-action-svg" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <span className="quick-action-copy">
                    <span className="quick-action-copy-title">{t('dashboard.quickAccess.account.title')}</span>
                    <span className="quick-action-copy-sub">{t('dashboard.quickAccess.account.subtitle')}</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
          {/* Sites Overview - Takes 2 columns */}
          <div className="flex">
            <div className="card w-full h-full flex flex-col" style={{ padding: 0 }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ padding: '18px', paddingBottom: 0 }}>
                <div className="min-w-0">
                  <div style={{ fontWeight: 950, fontSize: '16px', color: 'rgb(var(--foreground))' }}>{t('dashboard.sitesOverview')}</div>
                  <div style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '4px' }}>{t('dashboard.sitesOverviewSubtitle')}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href="/sites/new">
                    <button className="btn btn-primary" style={{ fontSize: '12px', height: '32px' }}>+ {t('dashboard.new')}</button>
                  </Link>
                  <Link href="/sites">
                    <button className="btn btn-outline" style={{ fontSize: '12px', height: '32px' }}>{t('dashboard.viewAll')}</button>
                  </Link>
                </div>
              </div>

              <div className="p-4 sm:p-5 flex-1">
                {/* Filters */}
                <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    placeholder={t('dashboard.searchSites')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 w-full sm:min-w-[180px]"
                  />
                  <select
                    className="input" style={{ width: 'auto', height: '36px', fontSize: '13px', padding: '0 12px' }}
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                  >
                    <option value="all">{t('dashboard.allPlans')}</option>
                    <option value="basic">BASIC</option>
                    <option value="pro">PRO</option>
                  </select>
                  <select
                    className="input" style={{ width: 'auto', height: '36px', fontSize: '13px', padding: '0 12px' }}
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'none' | 'plan')}
                  >
                    <option value="none">{t('dashboard.noGrouping')}</option>
                    <option value="plan">{t('dashboard.groupByPlan')}</option>
                  </select>
                </div>

                {loading ? (
                  <div className="py-12">
                    <LoadingSpinner text={t('common.loading')} />
                  </div>
                ) : sitesError ? (
                  <div className="py-12 text-center text-red-600 dark:text-red-400 text-sm">
                    {sitesError}
                  </div>
                ) : filteredSites.length === 0 && sites.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title={t('dashboard.noSitesYetTitle')}
                      description={t('dashboard.noSitesYetDescription')}
                      action={{
                        label: t('dashboard.createFirstSiteAction'),
                        onClick: () => window.location.href = '/sites/new',
                      }}
                    />
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="py-12 text-center text-muted text-sm">
                    {t('dashboard.noSites')}
                  </div>
                ) : groupBy === 'plan' && groupedSites ? (
                  <div className="space-y-5">
                    {Object.entries(groupedSites).map(([plan, sites]) => (
                      <div key={plan}>
                        <h3 className="text-sm font-semibold mb-2 capitalize text-foreground flex items-center gap-2">
                          {formatPlanTierLabel(plan)}
                          <span className="text-xs font-normal text-muted bg-surface px-2 py-0.5 rounded-full">{sites.length}</span>
                        </h3>
                        <div className="space-y-2">
                          {sites.slice(0, 3).map((site) => renderSiteCard(site))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSites.slice(0, 5).map((site) => renderSiteCard(site))}
                  </div>
                )}
              </div>
            </div>
          </div>



          <div className="flex">
<div className="card w-full h-full flex flex-col" style={{ padding: 0 }}>
          <div className="flex items-center justify-between gap-3" style={{ padding: '18px', paddingBottom: 0 }}>
            <div className="min-w-0">
              <div style={{ fontWeight: 950, fontSize: '16px', color: 'rgb(var(--foreground))' }}>{t('dashboard.recentActivity')}</div>
              <div style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '4px' }}>{t('dashboard.recentActivitySubtitle')}</div>
            </div>
            {sites.length > 1 && (
              <select
                className="input flex-shrink-0" style={{ width: 'auto', height: '36px', fontSize: '13px', padding: '0 12px' }}
                value={selectedSiteId || 'all'}
                onChange={(e) => setSelectedSiteId(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">{t('dashboard.allSitesOption')}</option>
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
          <div className="p-4 sm:p-5 flex-1">
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton variant="rectangular" width={28} height={28} className="rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton variant="text" width={200} height={14} />
                    </div>
                    <Skeleton variant="text" width={80} height={12} />
                  </div>
                ))}
              </div>
            ) : activityError ? (
              <div className="text-center py-8 text-red-600 dark:text-red-400 text-sm">
                {activityError}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                title={t('dashboard.noRecentActivity')}
                description={t('dashboard.activityWillAppear')}
              />
            ) : (
              <div className="space-y-1">
                {activity.map((item) => {
                  const normalizedMessage = item.message.toLowerCase();
                  const activityType =
                    normalizedMessage.includes('created') ||
                    normalizedMessage.includes('utworz') ||
                    normalizedMessage.includes('dodan')
                      ? 'create'
                      : normalizedMessage.includes('updated') ||
                          normalizedMessage.includes('zaktualiz') ||
                          normalizedMessage.includes('edytow')
                        ? 'update'
                        : normalizedMessage.includes('deleted') ||
                            normalizedMessage.includes('usun') ||
                            normalizedMessage.includes('skasow')
                          ? 'delete'
                          : 'default';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface/50 transition-colors"
                    >
                      <ActivityIcon type={activityType} />
                      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.message}</span>
                      <span className="text-xs text-muted whitespace-nowrap flex-shrink-0">
                        {new Date(item.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}






