"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMyTenants, getAuthToken, fetchActivity, fetchQuickStats, fetchTenantStats, type ActivityItem, type QuickStats } from '../../lib/api';
import { getLastTenantSlug, setLastTenantSlug, getRecentlyUsedTenants, getPinnedTenants, togglePinTenant, isTenantPinned } from '../../lib/prefs';
import type { TenantInfo } from '@repo/sdk';
import { useTranslations } from '@/hooks/useTranslations';
import { LoadingSpinner, EmptyState, Skeleton } from '@repo/ui';

export default function DashboardPage() {
  const t = useTranslations();
  const [sites, setSites] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [siteStats, setSiteStats] = useState<{ collections: number; media: number } | null>(null);
  const [overviewStats, setOverviewStats] = useState<Record<string, { collections: number; media: number; entries?: number; errors?: number }>>({});
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'plan'>('none');
  const [recentSites, setRecentSites] = useState<string[]>([]);
  const [pinnedSites, setPinnedSites] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyTenants();
        setSites(data);
        setRecentSites(getRecentlyUsedTenants());
        setPinnedSites(getPinnedTenants());

        const token = getAuthToken();
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.email || '');
          } catch {}
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : t('dashboard.failedToLoad');
        setError(errorMessage);
        if (e instanceof Error && /Missing auth token/i.test(e.message)) {
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      setActivityLoading(true);
      try {
        const [s, a] = await Promise.all([fetchQuickStats().catch(() => null), fetchActivity(5).catch(() => [])]);
        if (s) setStats(s);
        if (a) setActivity(a);
      } finally {
        setStatsLoading(false);
        setActivityLoading(false);
      }
    })();
  }, []);

  // Batch fetch stats for sites shown in Overview (recent + first 3)
  useEffect(() => {
    (async () => {
      if (sites.length === 0) return;
      const recentSlugs = recentSites.slice(0, 3);
      const recentSiteObjs = recentSlugs
        .map(slug => sites.find(s => s.tenant.slug === slug))
        .filter((s): s is TenantInfo => s !== undefined);
      const firstThree = sites.slice(0, 3);
      const toFetch = [...new Set([...recentSiteObjs, ...firstThree].map(s => s.tenantId))].slice(0, 5);
      
      const promises = toFetch.map(async (siteId) => {
        try {
          const s = await fetchTenantStats(siteId);
          return [siteId, { ...s, entries: 0, errors: 0 }] as const;
        } catch {
          return [siteId, null] as const;
        }
      });
      const results = await Promise.all(promises);
      const map: Record<string, { collections: number; media: number; entries?: number; errors?: number }> = {};
      results.forEach(([id, s]) => { if (s) map[id] = s; });
      setOverviewStats(map);
    })();
  }, [sites, recentSites]);

  // Removed onEnter - Site Panel routes (/tenant/*) are not available yet
  // Users should use Platform Panel routes (/sites/*) instead

  // Initialize selected site from prefs or first
  useEffect(() => {
    if (sites.length === 0) return;
    const last = getLastTenantSlug();
    const found = sites.find(s => s.tenant.slug === last) || sites[0];
    setSelectedSlug(found.tenant.slug);
  }, [sites]);

  // Load per-site stats for selected site
  useEffect(() => {
    (async () => {
      if (!selectedSlug) return;
      const site = sites.find(x => x.tenant.slug === selectedSlug);
      if (!site) return;
      try {
        const s = await fetchTenantStats(site.tenantId);
        setSiteStats(s);
      } catch {
        setSiteStats(null);
      }
    })();
  }, [selectedSlug, sites]);

  return (
    <div className="container py-8">
      {userEmail && (
        <div className="mb-6">
          <p className="text-muted">{t('dashboard.welcomeBack')}, {userEmail}</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="card mb-6">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickStats')}</h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Skeleton variant="rectangular" width={20} height={20} />
                    <Skeleton variant="text" width={48} height={28} />
                  </div>
                  <Skeleton variant="text" width={64} height={12} className="mx-auto mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { key: 'sites', labelKey: 'dashboard.totalSites', value: (stats?.tenants ?? sites.length), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              ) },
              { key: 'users', labelKey: 'dashboard.users', value: (stats?.users ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              ) },
              { key: 'active', labelKey: 'dashboard.active', value: (stats?.active ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              ) },
              { key: 'total', labelKey: 'dashboard.total', value: (stats?.total ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
              ) },
              { key: 'collections', labelKey: 'dashboard.collections', value: (stats?.collections ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="6" /><rect x="3" y="14" width="18" height="6" /></svg>
              ) },
              { key: 'media', labelKey: 'dashboard.media', value: (stats?.media ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 14 2-2 3 3 2-2 2 2" /></svg>
              ) },
            ].map((s) => (
              <div key={s.key} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span aria-hidden className="text-muted">{s.icon}</span>
                  <div className="text-3xl font-bold text-gradient">{String(s.value)}</div>
                </div>
                <div className="text-sm text-muted">{t(s.labelKey)}</div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Used Sites */}
        {recentSites.length > 0 && (
          <div className="card lg:col-span-2">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('dashboard.recentlyUsedSites')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentSites.slice(0, 3).map((slug) => {
                  const site = sites.find(s => s.tenant.slug === slug);
                  if (!site) return null;
                  const s = overviewStats[site.tenantId];
                  return (
                    <div key={site.tenantId} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold">{site.tenant.name}</div>
                          <div className="text-sm text-muted">{site.tenant.slug}</div>
                        </div>
                        <Link href={`/sites/${site.tenant.slug}`} className="btn btn-primary btn-sm">{t('sites.viewDetails')}</Link>
                      </div>
                      {s && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="chip chip-gradient text-xs">C: {s.collections}</span>
                          <span className="chip chip-gradient text-xs">M: {s.media}</span>
                          {s.entries !== undefined && <span className="chip chip-gradient text-xs">E: {s.entries}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sites overview */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.sitesOverview')}</h2>
              <div className="flex gap-2">
                <Link href="/sites" className="btn btn-outline">{t('dashboard.viewAll')}</Link>
                <Link href="/sites/new" className="btn btn-primary">+ {t('dashboard.new')}</Link>
              </div>
            </div>
            {/* Filters */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder={t('dashboard.searchSites')}
                className="border rounded p-2 text-sm flex-1 min-w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="border rounded p-2 text-sm"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                className="border rounded p-2 text-sm"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
              >
                <option value="none">No Grouping</option>
                <option value="plan">Group by Plan</option>
              </select>
            </div>
            {loading && (
              <div className="py-8">
                <LoadingSpinner text={t('common.loading')} />
              </div>
            )}
            {error && (
              <div className="py-8">
                <div className="text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="font-semibold mb-1">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            {!loading && !error && (() => {
              // Filter sites
              let filtered = sites.filter(s => {
                const matchesSearch = !searchQuery || s.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.tenant.slug.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesPlan = planFilter === 'all' || s.tenant.plan === planFilter;
                return matchesSearch && matchesPlan;
              });

              // Sort: pinned first, then by name
              filtered.sort((a, b) => {
                const aPinned = isTenantPinned(a.tenant.slug);
                const bPinned = isTenantPinned(b.tenant.slug);
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                return a.tenant.name.localeCompare(b.tenant.name);
              });

              // Group sites
              if (groupBy === 'plan') {
                const grouped: Record<string, typeof filtered> = {};
                filtered.forEach(s => {
                  const plan = s.tenant.plan || 'free';
                  if (!grouped[plan]) grouped[plan] = [];
                  grouped[plan].push(s);
                });
                return Object.keys(grouped).length === 0 ? (
                  <EmptyState
                    title={t('dashboard.noSitesYet')}
                    description={t('dashboard.createFirstSite')}
                    action={{
                      label: t('sites.create'),
                      onClick: () => window.location.href = '/sites/new',
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).map(([plan, groupSites]) => (
                      <div key={plan}>
                        <h3 className="text-sm font-semibold mb-2 capitalize">{plan} ({groupSites.length})</h3>
                        <div className="space-y-3">
                          {groupSites.slice(0, 3).map((site) => {
                            const s = overviewStats[site.tenantId];
                            return (
                              <div key={site.tenantId} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-semibold">{site.tenant.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePinTenant(site.tenant.slug);
                                        setPinnedSites(getPinnedTenants());
                                      }}
                                      className="text-muted hover:text-yellow-600"
                                      title={isTenantPinned(site.tenant.slug) ? 'Unpin' : 'Pin'}
                                    >
                                      {isTenantPinned(site.tenant.slug) ? '📌' : '📍'}
                                    </button>
                                  </div>
                                  <div className="text-sm text-muted">{site.tenant.slug}</div>
                                  <div className="mt-1 flex items-center gap-2 min-h-[22px] flex-wrap">
                                    {s ? (
                                      <>
                                        <span className="chip chip-gradient" title="Collections">C: {s.collections}</span>
                                        <span className="chip chip-gradient" title="Media">M: {s.media}</span>
                                        {s.entries !== undefined && <span className="chip chip-gradient" title="Entries">E: {s.entries}</span>}
                                        {s.errors !== undefined && s.errors > 0 && <span className="chip bg-red-100 text-red-700" title="Errors">⚠ {s.errors}</span>}
                                      </>
                                    ) : (
                                      <>
                                        <span className="skeleton inline-block h-5 w-16" />
                                        <span className="skeleton inline-block h-5 w-12" />
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link href={`/sites/${site.tenant.slug}`} className="btn btn-primary">{t('sites.viewDetails')}</Link>
                                  <Link href={`/sites/${site.tenant.slug}/users`} className="btn btn-outline">{t('sites.manageUsers')}</Link>
                                  <Link href={`/sites/${site.tenant.slug}/billing`} className="btn btn-outline">{t('sites.billing')}</Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return filtered.length === 0 ? (
                <EmptyState
                  title={t('dashboard.noSitesYet')}
                  description={t('dashboard.createFirstSite')}
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  }
                  action={{
                    label: t('sites.create'),
                    onClick: () => window.location.href = '/sites/new',
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {filtered.slice(0, 3).map((site) => {
                    const s = overviewStats[site.tenantId];
                    return (
                      <div key={site.tenantId} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold">{site.tenant.name}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinTenant(site.tenant.slug);
                                setPinnedSites(getPinnedTenants());
                              }}
                              className="text-muted hover:text-yellow-600"
                              title={isTenantPinned(site.tenant.slug) ? 'Unpin' : 'Pin'}
                            >
                              {isTenantPinned(site.tenant.slug) ? '📌' : '📍'}
                            </button>
                          </div>
                          <div className="text-sm text-muted">{site.tenant.slug}</div>
                          <div className="mt-1 flex items-center gap-2 min-h-[22px] flex-wrap">
                            {s ? (
                              <>
                                <span className="chip chip-gradient" title="Collections">C: {s.collections}</span>
                                <span className="chip chip-gradient" title="Media">M: {s.media}</span>
                                {s.entries !== undefined && <span className="chip chip-gradient" title="Entries">E: {s.entries}</span>}
                                {s.errors !== undefined && s.errors > 0 && <span className="chip bg-red-100 text-red-700" title="Errors">⚠ {s.errors}</span>}
                              </>
                            ) : (
                              <>
                                <span className="skeleton inline-block h-5 w-16" />
                                <span className="skeleton inline-block h-5 w-12" />
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/sites/${site.tenant.slug}`} className="btn btn-primary">{t('sites.viewDetails')}</Link>
                          <Link href={`/sites/${site.tenant.slug}/users`} className="btn btn-outline">{t('sites.manageUsers')}</Link>
                          <Link href={`/sites/${site.tenant.slug}/billing`} className="btn btn-outline">{t('sites.billing')}</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.quickActions')}</h2>
              {sites.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">{t('sites.title')}</label>
                  <select
                    className="border rounded p-2 text-sm"
                    value={selectedSlug}
                    onChange={(e) => { setSelectedSlug(e.target.value); setLastTenantSlug(e.target.value); }}
                  >
                    {sites.map((site) => (
                      <option key={site.tenantId} value={site.tenant.slug}>{site.tenant.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/sites/new" className="btn btn-primary">{t('dashboard.new')} {t('navigation.sites')}</Link>
              <Link href="/sites" className="btn btn-outline">{t('dashboard.viewAll')}</Link>
              {selectedSlug ? (
                <>
                  <Link href={`/sites/${selectedSlug}`} className="btn btn-outline">{t('sites.viewDetails')}</Link>
                  <Link href={`/sites/${selectedSlug}/users`} className="btn btn-outline">{t('sites.manageUsers')}</Link>
                  <Link href={`/sites/${selectedSlug}/billing`} className="btn btn-outline">{t('sites.billing')}</Link>
                  <div className="btn btn-outline opacity-50 cursor-not-allowed" title={t('sites.sitePanelComingSoon')}>
                    {t('sites.openSitePanel')} (Coming Soon)
                  </div>
                </>
              ) : (
                <>
                  <Link href="/sites" className="btn btn-outline">{t('navigation.sites')}</Link>
                  <Link href="/billing" className="btn btn-outline">{t('navigation.billing')}</Link>
                  <Link href="/account" className="btn btn-outline">{t('navigation.account')}</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card mt-6">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="hidden md:flex items-center gap-2">
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#3b82f6'}} /> {t('navigation.sites')}</span>
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#10b981'}} /> {t('navigation.users')}</span>
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#6366f1'}} /> {t('navigation.media')}</span>
            </div>
          </div>
          {activityLoading ? (
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Skeleton variant="circular" width={16} height={16} />
                    <Skeleton variant="text" width={192} height={16} />
                  </span>
                  <Skeleton variant="text" width={96} height={12} />
                </li>
              ))}
            </ul>
          ) : activity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Activity will appear here as you use the system"
              className="py-8"
            />
          ) : (
            <ul className="space-y-2">
              {activity.map((it) => {
                const msg = it.message || '';
                let color = 'text-slate-600';
                let icon = (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                );
                if (/site|tenant/i.test(msg)) { color = 'text-[var(--color-primary)]'; icon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>); }
                else if (/user/i.test(msg)) { color = 'text-[var(--color-accent)]'; icon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>); }
                else if (/media|file|image/i.test(msg)) { color = 'text-[var(--color-primary)]'; icon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 14 2-2 3 3 2-2 2 2"/></svg>); }
                return (
                  <li key={it.id} className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2"><span className={color}>{icon}</span>{msg}</span>
                    <span className="text-xs text-muted">{new Date(it.createdAt).toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
