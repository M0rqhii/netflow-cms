"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import type { TenantInfo } from '@repo/sdk';
import { fetchMyTenants, fetchActivity, fetchQuickStats, type ActivityItem, type QuickStats } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';
import { decodeAuthToken, getAuthToken } from '@/lib/api';

export default function DashboardPage() {
  const t = useTranslations();
  const [sites, setSites] = useState<TenantInfo[]>([]);
  const [stats, setStats] = useState<QuickStats>({ tenants: 0, collections: 0, media: 0, users: 0, active: 0, total: 0 });
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

  useEffect(() => {
    const loadData = async () => {
      // Fetch sites
      try {
        setLoading(true);
        setSitesError(null);
        const tenants = await fetchMyTenants();
        setSites(tenants);
      } catch (error) {
        setSitesError(error instanceof Error ? error.message : t('dashboard.failedToLoad'));
        setSites([]);
      } finally {
        setLoading(false);
      }

      // Fetch stats
      try {
        setStatsLoading(true);
        setStatsError(null);
        const quickStats = await fetchQuickStats();
        setStats(quickStats);
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : t('errors.failedToLoad'));
        setStats({ tenants: 0, collections: 0, media: 0, users: 0, active: 0, total: 0 });
      } finally {
        setStatsLoading(false);
      }

      // Fetch activity
      try {
        setActivityLoading(true);
        setActivityError(null);
        const activityData = await fetchActivity(10);
        setActivity(activityData);
      } catch (error) {
        setActivityError(error instanceof Error ? error.message : t('errors.failedToLoad'));
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredSites = sites.filter(site => {
    const matchesSearch = !searchQuery || 
      site.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      site.tenant.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || site.tenant.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const groupedSites = groupBy === 'plan' 
    ? filteredSites.reduce((acc, site) => {
        const plan = site.tenant.plan || 'free';
        if (!acc[plan]) acc[plan] = [];
        acc[plan].push(site);
        return acc;
      }, {} as Record<string, typeof filteredSites>)
    : null;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('dashboard.welcomeBack')}, {(() => {
            const token = getAuthToken();
            const payload = token ? decodeAuthToken(token) : null;
            return payload?.email || 'user@example.com';
          })()}
        </p>
      </div>

      <div className="space-y-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton variant="rectangular" width={48} height={28} className="mx-auto mb-2" />
                    <Skeleton variant="text" width={64} height={12} className="mx-auto" />
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="text-center py-4 text-red-600 text-sm">
                {statsError}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { key: 'sites', label: t('dashboard.totalSites'), value: stats.tenants, icon: '🏢' },
                  { key: 'users', label: t('dashboard.users'), value: stats.users, icon: '👥' },
                  { key: 'active', label: t('dashboard.active'), value: stats.active ?? 0, icon: '✓' },
                  { key: 'total', label: t('dashboard.total'), value: stats.total ?? stats.tenants, icon: '📊' },
                  { key: 'collections', label: t('dashboard.collections'), value: stats.collections, icon: '📁' },
                  { key: 'media', label: t('dashboard.media'), value: stats.media, icon: '🖼️' },
                ].map((stat) => (
                  <div key={stat.key} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">{stat.icon}</span>
                      <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                    </div>
                    <div className="text-sm text-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sites Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('dashboard.sitesOverview')}</CardTitle>
              <div className="flex gap-2">
                <Link href="/sites/new">
                  <Button variant="primary" size="sm">{t('dashboard.new')}</Button>
                </Link>
                <Link href="/sites">
                  <Button variant="outline" size="sm">{t('dashboard.viewAll')}</Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <Input
                placeholder={t('dashboard.searchSites')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <select
                className="border rounded-md px-3 py-2 text-sm h-10"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">{t('dashboard.allPlans')}</option>
                <option value="free">{t('dashboard.free')}</option>
                <option value="professional">{t('dashboard.professional')}</option>
                <option value="enterprise">{t('dashboard.enterprise')}</option>
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm h-10"
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
              <div className="py-8 text-center text-red-600 text-sm">
                {sitesError}
              </div>
            ) : filteredSites.length === 0 ? (
              <EmptyState
                title={t('dashboard.noSitesYet')}
                description={t('dashboard.createFirstSite')}
                action={{
                  label: t('dashboard.createSite'),
                  onClick: () => window.location.href = '/sites/new',
                }}
              />
            ) : groupBy === 'plan' && groupedSites ? (
              <div className="space-y-4">
                {Object.entries(groupedSites).map(([plan, sites]) => (
                  <div key={plan}>
                    <h3 className="text-sm font-semibold mb-2 capitalize">{plan} ({sites.length})</h3>
                    <div className="space-y-3">
                      {sites.slice(0, 3).map((site) => (
                        <div key={site.tenantId} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">{site.tenant.name}</div>
                            <div className="text-sm text-muted">{site.tenant.slug}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge>{t('sites.plan')}: {site.tenant.plan || 'free'}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/sites/${site.tenant.slug}`}>
                              <Button variant="primary" size="sm">{t('common.view')}</Button>
                            </Link>
                            <Link href={`/sites/${site.tenant.slug}/users`}>
                              <Button variant="outline" size="sm">{t('sites.users')}</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSites.slice(0, 3).map((site) => (
                  <div key={site.tenantId} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{site.tenant.name}</div>
                      <div className="text-sm text-muted">{site.tenant.slug}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge>{t('sites.plan')}: {site.tenant.plan || 'free'}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/sites/${site.tenant.slug}`}>
                        <Button variant="primary" size="sm">{t('common.view')}</Button>
                      </Link>
                      <Link href={`/sites/${site.tenant.slug}/users`}>
                        <Button variant="outline" size="sm">{t('sites.users')}</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/sites/new">
                <Button variant="primary" className="w-full">{t('dashboard.createSite')}</Button>
              </Link>
              <Link href="/sites">
                <Button variant="outline" className="w-full">{t('dashboard.viewAllSites')}</Button>
              </Link>
              <Link href="/billing">
                <Button variant="outline" className="w-full">{t('navigation.billing')}</Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="w-full">{t('navigation.account')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <ul className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <Skeleton variant="text" width={192} height={16} />
                    <Skeleton variant="text" width={96} height={12} />
                  </li>
                ))}
              </ul>
            ) : activityError ? (
              <div className="text-center py-4 text-red-600 text-sm">
                {activityError}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                title={t('dashboard.noRecentActivity')}
                description={t('dashboard.activityWillAppear')}
              />
            ) : (
              <ul className="space-y-2">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <span className="text-blue-600">●</span>
                      {item.message}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


