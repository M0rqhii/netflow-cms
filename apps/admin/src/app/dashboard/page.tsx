"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { EmptyState, Skeleton, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import type { TenantInfo } from '@repo/sdk';

// Mock data
const mockSites: TenantInfo[] = [
  {
    tenantId: '1',
    role: 'admin',
    tenant: { id: '1', name: 'Acme Corporation', slug: 'acme-corp', plan: 'professional' },
  },
  {
    tenantId: '2',
    role: 'editor',
    tenant: { id: '2', name: 'Tech Startup', slug: 'tech-startup', plan: 'free' },
  },
  {
    tenantId: '3',
    role: 'viewer',
    tenant: { id: '3', name: 'Design Studio', slug: 'design-studio', plan: 'enterprise' },
  },
];

const mockStats = {
  tenants: 3,
  collections: 12,
  media: 45,
  users: 8,
  active: 2,
  total: 3,
};

const mockActivity = [
  { id: '1', type: 'site', message: 'Created new site "Acme Corporation"', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'user', message: 'Invited user john@example.com', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'media', message: 'Uploaded 5 new images', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: '4', type: 'site', message: 'Updated site settings', createdAt: new Date(Date.now() - 14400000).toISOString() },
];

export default function DashboardPage() {
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'plan'>('none');

  const filteredSites = mockSites.filter(site => {
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
        <p className="text-muted">Welcome back, user@example.com</p>
      </div>

      {/* Quick Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton variant="rectangular" width={48} height={28} className="mx-auto mb-2" />
                  <Skeleton variant="text" width={64} height={12} className="mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { key: 'sites', label: 'Total Sites', value: mockStats.tenants, icon: '🏢' },
                { key: 'users', label: 'Users', value: mockStats.users, icon: '👥' },
                { key: 'active', label: 'Active', value: mockStats.active, icon: '✓' },
                { key: 'total', label: 'Total', value: mockStats.total, icon: '📊' },
                { key: 'collections', label: 'Collections', value: mockStats.collections, icon: '📁' },
                { key: 'media', label: 'Media', value: mockStats.media, icon: '🖼️' },
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
              <CardTitle>Sites Overview</CardTitle>
              <div className="flex gap-2">
                <Link href="/sites">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
                <Link href="/sites/new">
                  <Button variant="primary" size="sm">+ New</Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <select
                className="border rounded-md px-3 py-2 text-sm h-10"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm h-10"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'none' | 'plan')}
              >
                <option value="none">No Grouping</option>
                <option value="plan">Group by Plan</option>
              </select>
            </div>

            {loading ? (
              <div className="py-8">
                <LoadingSpinner text="Loading..." />
              </div>
            ) : filteredSites.length === 0 ? (
              <EmptyState
                title="No sites yet"
                description="Create your first site to get started"
                action={{
                  label: 'Create Site',
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
                              <Badge>C: {Math.floor(Math.random() * 10)}</Badge>
                              <Badge>M: {Math.floor(Math.random() * 20)}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/sites/${site.tenant.slug}`}>
                              <Button variant="primary" size="sm">View</Button>
                            </Link>
                            <Link href={`/sites/${site.tenant.slug}/users`}>
                              <Button variant="outline" size="sm">Users</Button>
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
                        <Badge>C: {Math.floor(Math.random() * 10)}</Badge>
                        <Badge>M: {Math.floor(Math.random() * 20)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/sites/${site.tenant.slug}`}>
                        <Button variant="primary" size="sm">View</Button>
                      </Link>
                      <Link href={`/sites/${site.tenant.slug}/users`}>
                        <Button variant="outline" size="sm">Users</Button>
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
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/sites/new">
                <Button variant="primary" className="w-full">+ New Site</Button>
              </Link>
              <Link href="/sites">
                <Button variant="outline" className="w-full">View All Sites</Button>
              </Link>
              <Link href="/billing">
                <Button variant="outline" className="w-full">Billing</Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="w-full">Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <Skeleton variant="text" width={192} height={16} />
                  <Skeleton variant="text" width={96} height={12} />
                </li>
              ))}
            </ul>
          ) : mockActivity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Activity will appear here as you use the system"
              className="py-8"
            />
          ) : (
            <ul className="space-y-2">
              {mockActivity.map((item) => (
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
  );
}

