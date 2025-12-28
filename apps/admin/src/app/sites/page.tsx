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
import { fetchMyTenants } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';

let tenantsCache: TenantInfo[] | null = null;
let tenantsPromise: Promise<TenantInfo[]> | null = null;

async function loadTenants(): Promise<TenantInfo[]> {
  if (tenantsCache) return tenantsCache;
  if (!tenantsPromise) {
    tenantsPromise = fetchMyTenants()
      .then((data) => {
        tenantsCache = data;
        return data;
      })
      .catch((error) => {
        tenantsPromise = null;
        throw error;
      });
  }
  return tenantsPromise;
}

export default function SitesPage() {
  const t = useTranslations();
  const [sites, setSites] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const { push } = useToast();

  useEffect(() => {
    let isMounted = true;

    loadTenants()
      .then((data) => {
        if (!isMounted) return;
        setSites(data);
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
  }, [push]);

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const plan = planFilter.toLowerCase();

    return sites
      .filter(site => {
        const matchesSearch =
          !query ||
          site.tenant.name.toLowerCase().includes(query) ||
          site.tenant.slug.toLowerCase().includes(query);
        const sitePlan = (site.tenant.plan || 'free').toLowerCase();
        const matchesPlan = plan === 'all' || sitePlan === plan;
        return matchesSearch && matchesPlan;
      })
      .sort((a, b) => a.tenant.name.localeCompare(b.tenant.name));
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
    <div className="container py-4 sm:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('sitesList.title')}</h1>
          <p className="text-sm text-muted mt-1">{t('sitesList.manageAllSites')}</p>
        </div>
        <Link href="/sites/new">
          <Button variant="primary" className="w-full sm:w-auto">{t('sitesList.newSite')}</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Input
                placeholder={t('sitesList.searchSitesByNameOrSlug')}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="flex-1 w-full sm:min-w-[200px]"
              />
              <select
                className="border rounded-md px-3 py-2 text-sm h-10 w-full sm:w-auto"
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
        <Card>
        <CardHeader>
          <CardTitle>
            {loading ? t('sitesList.loading') : `${filteredSites.length} ${filteredSites.length === 1 ? t('sitesList.site') : t('sitesList.sites')}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <tr className="text-left text-muted border-b">
                      <th scope="col" className="py-3 px-4 font-semibold">{t('sitesList.name')}</th>
                      <th scope="col" className="py-3 px-4 font-semibold">{t('sitesList.slug')}</th>
                      <th scope="col" className="py-3 px-4 font-semibold">{t('sitesList.plan')}</th>
                      <th scope="col" className="py-3 px-4 font-semibold">{t('sitesList.yourRole')}</th>
                      <th scope="col" className="text-right py-3 px-4 font-semibold">{t('sitesList.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSites.map((site) => (
                      <tr key={site.tenantId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold">{site.tenant.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{site.tenant.slug}</code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge color={getPlanBadgeColor(site.tenant.plan)}>
                            {site.tenant.plan || 'free'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge>{site.role}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Link href={`/sites/${site.tenant.slug}`}>
                              <Button variant="primary" size="sm">{t('sitesList.view')}</Button>
                            </Link>
                            <Link href={`/sites/${site.tenant.slug}/users`}>
                              <Button variant="outline" size="sm">{t('sitesList.users')}</Button>
                            </Link>
                            <Link href={`/sites/${site.tenant.slug}/billing`}>
                              <Button variant="outline" size="sm">{t('sitesList.billing')}</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {filteredSites.map((site) => (
                  <div key={site.tenantId} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-sm text-muted mb-1">{t('sitesList.name')}</div>
                      <div className="font-semibold">{site.tenant.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-1">{t('sitesList.slug')}</div>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{site.tenant.slug}</code>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-sm text-muted mb-1">{t('sitesList.plan')}</div>
                        <Badge color={getPlanBadgeColor(site.tenant.plan)}>
                          {site.tenant.plan || 'free'}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted mb-1">{t('sitesList.yourRole')}</div>
                        <Badge>{site.role}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/sites/${site.tenant.slug}`}>
                          <Button variant="primary" size="sm" className="w-full">{t('sitesList.view')}</Button>
                        </Link>
                        <div className="flex gap-2">
                          <Link href={`/sites/${site.tenant.slug}/users`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">{t('sitesList.users')}</Button>
                          </Link>
                          <Link href={`/sites/${site.tenant.slug}/billing`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">{t('sitesList.billing')}</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
