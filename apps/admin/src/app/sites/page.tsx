"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
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
          message: error instanceof Error ? error.message : 'Failed to load sites',
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
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-sm text-muted mt-1">Manage all your sites and organizations</p>
        </div>
        <Link href="/sites/new">
          <Button variant="primary">+ New Site</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                placeholder="Search sites by name or slug..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <select
                className="border rounded-md px-3 py-2 text-sm h-10"
                value={planFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlanFilter(e.target.value)}
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Sites List */}
        <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Loading...' : `${filteredSites.length} ${filteredSites.length === 1 ? 'Site' : 'Sites'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <LoadingSpinner text="Loading sites..." />
            </div>
          ) : filteredSites.length === 0 ? (
            <EmptyState
              title={searchQuery || planFilter !== 'all' ? 'No sites found' : 'No sites yet'}
              description={
                searchQuery || planFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first site to get started'
              }
              action={
                !searchQuery && planFilter === 'all'
                  ? {
                      label: 'Create Site',
                      onClick: () => window.location.href = '/sites/new',
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Slug</th>
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold">Your Role</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
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
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/sites/${site.tenant.slug}`}>
                            <Button variant="primary" size="sm">View</Button>
                          </Link>
                          <Link href={`/sites/${site.tenant.slug}/users`}>
                            <Button variant="outline" size="sm">Users</Button>
                          </Link>
                          <Link href={`/sites/${site.tenant.slug}/billing`}>
                            <Button variant="outline" size="sm">Billing</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
