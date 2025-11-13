"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createApiClient } from '@repo/sdk';
import { getAuthToken, getTenantToken, setTenantToken, fetchMyTenants } from '@/lib/api';
import { setLastTenantSlug } from '@/lib/prefs';
import type { TenantInfo } from '@repo/sdk';

export default function TenantCmsPage() {
  const params = useParams<{ slug: string }>();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const slug = params?.slug as string | undefined;
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const tenants = await fetchMyTenants();
        const tenant = tenants.find((t) => t.tenant.slug === slug);

        if (!tenant) {
          setError('Tenant not found or you do not have access');
          setLoading(false);
          return;
        }

        setTenantInfo(tenant);
        setLastTenantSlug(tenant.tenant.slug);

        const existingToken = getTenantToken(tenant.tenantId);
        if (existingToken) {
          setHasToken(true);
          setLoading(false);
          return;
        }

        const global = getAuthToken();
        if (!global) {
          window.location.href = '/login';
          return;
        }

        try {
          const api = createApiClient();
          const res = await api.issueTenantToken(global, tenant.tenantId);
          setTenantToken(tenant.tenantId, res.access_token);
          setHasToken(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to get tenant token');
          setHasToken(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tenant');
        setHasToken(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.slug]);

  if (loading) {
    return (
      <div className="container py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!hasToken || error) {
    return (
      <div className="container py-8">
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to Hub
        </Link>
        <h1 className="text-2xl font-bold mb-2 mt-4">CMS: {params?.slug}</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {!error && (
          <p className="text-red-600 mb-4">No tenant token found. Go to Hub and enter a tenant.</p>
        )}
        <Link href="/dashboard" className="btn btn-primary inline-block">
          Go to Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Hub
          </Link>
          <h1 className="text-xl font-bold">{tenantInfo?.tenant.name || params?.slug}</h1>
          {tenantInfo && <span className="badge">{tenantInfo.role}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">Collections</h3>
            <p className="text-sm text-gray-600 mb-4">Manage your content collections</p>
            <Link href={`/tenant/${encodeURIComponent(tenantInfo?.tenant.slug || String(params?.slug || ''))}/collections`} className="btn btn-primary">View Collections</Link>
          </div>
        </div>

        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">Content Types</h3>
            <p className="text-sm text-gray-600 mb-4">Define content structures</p>
            <Link href={`/tenant/${encodeURIComponent(tenantInfo?.tenant.slug || String(params?.slug || ''))}/types`} className="btn btn-primary">View Types</Link>
          </div>
        </div>

        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">Media</h3>
            <p className="text-sm text-gray-600 mb-4">Manage media files</p>
            <Link href={`/tenant/${encodeURIComponent(tenantInfo?.tenant.slug || String(params?.slug || ''))}/media`} className="btn btn-primary">View Media</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
