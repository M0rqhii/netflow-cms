"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@repo/ui';
import { LoadingSpinner } from '@repo/ui';
import { decodeAuthToken, getAuthToken, getDevSites } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';

const PRIVILEGED_ROLES = ['super_admin', 'org_admin', 'site_admin'];
const PRIVILEGED_PLATFORM_ROLES = ['platform_admin'];

type DevSiteRow = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  createdAt?: string;
};

type SiteWithCreatedAt = SiteInfo['site'] & { createdAt?: string };

const isSiteInfo = (value: unknown): value is SiteInfo => {
  return Boolean(value && typeof value === 'object' && 'site' in value && 'siteId' in value);
};

export default function DevSitesPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const userPlatformRole = (payload?.platformRole as string) || '';
  const isPrivileged = 
    PRIVILEGED_ROLES.includes(userRole) || 
    PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);

  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevSites()
      .then((data) => {
        const normalized: SiteInfo[] = (Array.isArray(data) ? data : []).map((item) => {
          if (isSiteInfo(item)) return item;
          const fallback = item as DevSiteRow;
          return {
            siteId: fallback.id,
            role: 'admin',
            site: { id: fallback.id, name: fallback.name, slug: fallback.slug, plan: fallback.plan ?? 'free', createdAt: fallback.createdAt },
          };
        });
        setSites(normalized);
      })
      .catch((e) => {
        // Don't show error for 403 Forbidden - user will see access denied message
        const isForbidden = e instanceof Error && 
          (e.message.includes('403') || 
           e.message.includes('Forbidden') ||
           e.message.includes('Insufficient permissions'));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : 'Failed to load sites');
        }
      })
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
    <DevPanelLayout title="Sites" description="List of all sites (non-prod)">

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
                    <tr key={site.siteId} className="border-b">
                      <td className="py-2 font-mono text-xs">{site.siteId}</td>
                      <td className="py-2">{site.site.name}</td>
                      <td className="py-2 font-mono text-xs">{site.site.slug}</td>
                      <td className="py-2">{site.site.plan || 'free'}</td>
                      <td className="py-2">
                        {(() => {
                          const createdAt = (site.site as SiteWithCreatedAt).createdAt;
                          return createdAt ? new Date(createdAt).toLocaleString() : 'N/A';
                        })()}
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
