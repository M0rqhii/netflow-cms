"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TenantInfo } from '@repo/sdk';
import { fetchMyTenants, exchangeTenantToken } from '@/lib/api';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyTenants();
        setTenants(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tenants');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onEnter = async (t: TenantInfo) => {
    try {
      await exchangeTenantToken(t.tenantId);
      window.location.href = `/tenant/${t.tenant.slug}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cannot enter tenant');
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link href="/tenant/new" className="btn btn-primary">+ New Tenant</Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body flex items-center justify-between">
                <div>
                  <div className="skeleton h-5 w-40 mb-2" />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="skeleton h-9 w-24" />
                  <span className="skeleton h-9 w-20" />
                  <span className="skeleton h-9 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="space-y-3">
          {tenants.length === 0 ? (
            <p className="text-muted">No tenants found.</p>
          ) : (
            tenants.map((t) => (
              <div key={t.tenantId} className="card">
                <div className="card-body flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{t.tenant.name}</div>
                    <div className="text-sm text-muted mt-1">{t.tenant.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-primary" onClick={() => onEnter(t)}>Enter CMS</button>
                    <Link href={`/tenant/${t.tenant.slug}`} className="btn btn-outline">Manage</Link>
                    <Link href={`/users?tenant=${encodeURIComponent(t.tenant.slug)}`} className="btn btn-outline">Invite</Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
