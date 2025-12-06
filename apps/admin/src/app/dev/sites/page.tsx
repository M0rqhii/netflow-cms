"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@repo/ui';
import { decodeAuthToken, getAuthToken, getDevSites } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';

const PRIVILEGED_ROLES = ['super_admin', 'tenant_admin'];

export default function DevSitesPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole);

  const [sites, setSites] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevSites()
      .then((data) => {
        const normalized: TenantInfo[] = (data as any[]).map((s: any) => {
          if (s?.tenant) return s as TenantInfo;
          return {
            tenantId: s.id,
            role: 'admin',
            tenant: { id: s.id, name: s.name, slug: s.slug, plan: s.plan, createdAt: s.createdAt },
          } as TenantInfo;
        });
        setSites(normalized);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load sites'))
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged]);

  if (isProd) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Dev Panel disabled"
          description="This panel is available only in non-production environments."
        />
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Access denied"
          description="Only privileged users can access the Dev Panel."
          action={{
            label: 'Back to dashboard',
            onClick: () => (window.location.href = '/dashboard'),
          }}
        />
      </div>
    );
  }

  return (
    <DevPanelLayout title="Sites" description="List of all sites/tenants (non-prod)">

      <Card>
        <CardHeader>
          <CardTitle>Sites</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <LoadingSpinner text="Loading sites..." />
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : sites.length === 0 ? (
            <EmptyState title="No sites" description="No sites found for this account." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-2">ID</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Slug</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.tenantId} className="border-b">
                      <td className="py-2 font-mono text-xs">{site.tenantId}</td>
                      <td className="py-2">{site.tenant.name}</td>
                      <td className="py-2 font-mono text-xs">{site.tenant.slug}</td>
                      <td className="py-2">{site.tenant.plan || 'free'}</td>
                      <td className="py-2">
                        {(site as any)?.tenant?.createdAt
                          ? new Date((site as any).tenant.createdAt).toLocaleString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DevPanelLayout>
  );
}
