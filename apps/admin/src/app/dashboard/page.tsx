"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMyTenants, exchangeTenantToken, getAuthToken, fetchActivity, fetchQuickStats, fetchTenantStats, type ActivityItem, type QuickStats } from '../../lib/api';
import { getLastTenantSlug, setLastTenantSlug } from '../../lib/prefs';
import type { TenantInfo } from '@repo/sdk';

export default function DashboardPage() {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [tenantStats, setTenantStats] = useState<{ collections: number; media: number } | null>(null);
  const [overviewStats, setOverviewStats] = useState<Record<string, { collections: number; media: number }>>({});
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyTenants();
        setTenants(data);

        const token = getAuthToken();
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUserEmail(payload.email || '');
          } catch {}
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tenants');
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

  // Batch fetch stats for tenants shown in Overview (first 3)
  useEffect(() => {
    (async () => {
      if (tenants.length === 0) return;
      const firstThree = tenants.slice(0, 3);
      const promises = firstThree.map(async (t) => {
        try {
          const s = await fetchTenantStats(t.tenantId);
          return [t.tenantId, s] as const;
        } catch {
          return [t.tenantId, null] as const;
        }
      });
      const results = await Promise.all(promises);
      const map: Record<string, { collections: number; media: number }> = {};
      results.forEach(([id, s]) => { if (s) map[id] = s; });
      setOverviewStats(map);
    })();
  }, [tenants]);

  const onEnter = async (tenant: TenantInfo) => {
    try {
      setLastTenantSlug(tenant.tenant.slug);
      await exchangeTenantToken(tenant.tenantId);
      window.location.href = `/tenant/${tenant.tenant.slug}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cannot enter tenant');
    }
  };

  // Initialize selected tenant from prefs or first
  useEffect(() => {
    if (tenants.length === 0) return;
    const last = getLastTenantSlug();
    const found = tenants.find(t => t.tenant.slug === last) || tenants[0];
    setSelectedSlug(found.tenant.slug);
  }, [tenants]);

  // Load per-tenant stats for selected tenant
  useEffect(() => {
    (async () => {
      if (!selectedSlug) return;
      const t = tenants.find(x => x.tenant.slug === selectedSlug);
      if (!t) return;
      try {
        const s = await fetchTenantStats(t.tenantId);
        setTenantStats(s);
      } catch {
        setTenantStats(null);
      }
    })();
  }, [selectedSlug, tenants]);

  return (
    <div className="container py-8">
      {userEmail && (
        <div className="mb-6">
          <p className="text-muted">Welcome back, {userEmail}</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="card mb-6">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="skeleton inline-block h-5 w-5" />
                    <span className="skeleton inline-block h-7 w-12" />
                  </div>
                  <div className="skeleton mx-auto mt-2 h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { key: 'tenants', label: 'Tenants', value: (stats?.tenants ?? tenants.length), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              ) },
              { key: 'users', label: 'Users', value: (stats?.users ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              ) },
              { key: 'active', label: 'Active', value: (stats?.active ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              ) },
              { key: 'total', label: 'Total', value: (stats?.total ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
              ) },
              { key: 'collections', label: 'Collections', value: (stats?.collections ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="6" /><rect x="3" y="14" width="18" height="6" /></svg>
              ) },
              { key: 'media', label: 'Media', value: (stats?.media ?? '-'), icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 14 2-2 3 3 2-2 2 2" /></svg>
              ) },
            ].map((s) => (
              <div key={s.key} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span aria-hidden className="text-muted">{s.icon}</span>
                  <div className="text-3xl font-bold text-gradient">{s.value as any}</div>
                </div>
                <div className="text-sm text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants overview */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Tenants Overview</h2>
              <div className="flex gap-2">
                <Link href="/tenants" className="btn btn-outline">View all</Link>
                <Link href="/tenant/new" className="btn btn-primary">+ New</Link>
              </div>
            </div>
            {loading && <p className="text-muted">Loading...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && (
              tenants.length === 0 ? (
                <p className="text-muted">No tenants yet. Create your first tenant.</p>
              ) : (
                <div className="space-y-3">
                  {tenants.slice(0, 3).map((t) => {
                    const s = overviewStats[t.tenantId];
                    return (
                      <div key={t.tenantId} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{t.tenant.name}</div>
                          <div className="text-sm text-muted">{t.tenant.slug}</div>
                          <div className="mt-1 flex items-center gap-2 min-h-[22px]">
                            {s ? (
                              <>
                                <span className="chip chip-gradient">C: {s.collections}</span>
                                <span className="chip chip-gradient">M: {s.media}</span>
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
                          <button className="btn btn-primary" onClick={() => onEnter(t)}>Enter</button>
                          <Link href={`/tenant/${t.tenant.slug}`} className="btn btn-outline">Manage</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              {tenants.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted">Tenant</label>
                  <select
                    className="border rounded p-2 text-sm"
                    value={selectedSlug}
                    onChange={(e) => { setSelectedSlug(e.target.value); setLastTenantSlug(e.target.value); }}
                  >
                    {tenants.map((t) => (
                      <option key={t.tenantId} value={t.tenant.slug}>{t.tenant.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/tenant/new" className="btn btn-primary">New Tenant</Link>
              <Link href="/tenants" className="btn btn-outline">All Tenants</Link>
              {selectedSlug ? (
                <>
                  <Link href={`/tenant/${selectedSlug}/collections`} className="btn btn-outline">{`Collections${tenantStats ? ` (${tenantStats.collections})` : ''}`}</Link>
                  <Link href={`/tenant/${selectedSlug}/media`} className="btn btn-outline">{`Media${tenantStats ? ` (${tenantStats.media})` : ''}`}</Link>
                  <Link href={`/tenant/${selectedSlug}/types`} className="btn btn-outline">Types</Link>
                  {(() => {
                    const t = tenants.find(x => x.tenant.slug === selectedSlug);
                    const role = t?.role || 'viewer';
                    return role === 'owner' || role === 'admin' ? (
                      <Link href={`/tenant/${selectedSlug}/users`} className="btn btn-outline">Users</Link>
                    ) : null;
                  })()}
                </>
              ) : (
                <>
                  <Link href="/tenants" className="btn btn-outline">Collections</Link>
                  <Link href="/tenants" className="btn btn-outline">Media</Link>
                  <Link href="/tenants" className="btn btn-outline">Types</Link>
                  <Link href="/tenants" className="btn btn-outline">Users</Link>
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
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#3b82f6'}} /> Tenant</span>
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#10b981'}} /> User</span>
              <span className="badge-sm"><span className="dot" style={{background:'currentColor', color:'#6366f1'}} /> Media</span>
            </div>
          </div>
          {activityLoading ? (
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="skeleton h-4 w-4 inline-block" /><span className="skeleton h-4 w-48 inline-block" /></span>
                  <span className="skeleton h-3 w-24 inline-block" />
                </li>
              ))}
            </ul>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((it) => {
                const msg = it.message || '';
                let color = 'text-slate-600';
                let icon = (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                );
                if (/tenant/i.test(msg)) { color = 'text-[var(--color-primary)]'; icon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>); }
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
