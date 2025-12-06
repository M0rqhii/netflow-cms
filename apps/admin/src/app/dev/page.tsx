"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@repo/ui';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';
import {
  fetchMyTenants,
  fetchTenantUsers,
  decodeAuthToken,
  getAuthToken,
  getDevSummary,
  getDevEmails,
  getDevPayments,
  getDevSites,
} from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';

const PRIVILEGED_ROLES = ['super_admin', 'tenant_admin'];

export default function DevPanelPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const userEmail = (payload?.email as string) || '';
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole);

  const [sites, setSites] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [devSummary, setDevSummary] = useState<{ sites: number; users: number; emails: number; subscriptions: number } | null>(null);
  const [emailLog, setEmailLog] = useState<Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; createdAt?: string }>>([]);
  const [paymentEvents, setPaymentEvents] = useState<
    Array<{ id: string; tenantId: string; plan: string; status: string; currentPeriodStart?: string; currentPeriodEnd?: string; createdAt?: string }>
  >([]);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getDevSites().catch(async () => {
        // Fallback: user-visible sites
        const fallback = await fetchMyTenants();
        return fallback;
      }),
      getDevSummary().catch(() => null),
      getDevEmails().catch(() => []),
      getDevPayments().catch(() => []),
    ])
      .then(([siteData, summary, emails, payments]) => {
        const normalizedSites: TenantInfo[] = (siteData as any[]).map((s: any) => {
          if (s?.tenant) return s as TenantInfo;
          return {
            tenantId: s.id,
            role: 'admin',
            tenant: {
              id: s.id,
              name: s.name,
              slug: s.slug,
              plan: s.plan,
              createdAt: s.createdAt,
            },
          } as TenantInfo;
        });
        setSites(normalizedSites);
        setDevSummary(summary ? { sites: summary.sites, users: summary.users, emails: summary.emails, subscriptions: summary.subscriptions } : null);
        setEmailLog(emails);
        setPaymentEvents(payments);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dev data'))
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged]);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    if (!sites.length) return;
    setUsersError(null);
    Promise.all(
      sites.map((site) => fetchTenantUsers(site.tenantId).then((list) => list.length).catch(() => null))
    )
      .then((results) => {
        const total = results.reduce((acc, val) => (val === null ? acc : acc + val), 0);
        setUsersCount(total);
        if (results.some((v) => v === null)) {
          setUsersError('Some user lists failed to load.');
        }
      })
      .catch(() => {
        setUsersCount(null);
        setUsersError('Unable to load users for sites.');
      });
  }, [isProd, isPrivileged, sites]);

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
    <DevPanelLayout title="Dev Panel" description="Internal visibility into dev-only providers and environment">
      <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted">Active profile:</span>
            <Badge>{appProfile}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Node env:</span>
            <Badge>{process.env.NODE_ENV || 'unknown'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">API URL:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Timestamp:</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted">Email:</span>
            <span>{userEmail || 'unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted">Role:</span>
            <Badge>{userRole || 'unknown'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border rounded-lg p-3">
              <div className="text-muted">Sites</div>
              <div className="text-2xl font-semibold">{devSummary?.sites ?? sites.length}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-muted">Users (all sites)</div>
              <div className="text-2xl font-semibold">
                {devSummary?.users ?? (usersCount !== null ? usersCount : '—')}
              </div>
              {usersError && <div className="text-xs text-warning mt-1">{usersError}</div>}
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-muted">Dev emails sent</div>
              <div className="text-2xl font-semibold">{devSummary?.emails ?? emailLog.length}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-muted">Simulated subscriptions</div>
              <div className="text-2xl font-semibold">{devSummary?.subscriptions ?? paymentEvents.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dev Providers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'Payment', provider: 'DevPaymentProvider' },
            { name: 'Mailer', provider: 'DevMailer / DevEmailLog' },
            { name: 'Storage', provider: 'LocalFileStorage' },
            { name: 'Domain', provider: 'DevDomainProvider' },
          ].map((item) => (
            <div key={item.provider} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.name}</span>
                <Badge tone="success">Dev</Badge>
              </div>
              <p className="text-sm text-muted">{item.provider}</p>
              <p className="text-xs text-muted">
                Active in this environment. Use this panel to monitor activity without checking raw logs.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent email log (DevMailer)</CardTitle>
        </CardHeader>
        <CardContent>
          {emailLog.length === 0 ? (
            <EmptyState title="No email logs" description="DevEmailLog has no entries yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-3 px-4 font-semibold">Recipient</th>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLog.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{log.to}</td>
                      <td className="py-3 px-4">{log.subject}</td>
                      <td className="py-3 px-4">
                        <Badge tone={log.status === 'sent' ? 'success' : 'warning'}>{log.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted">{new Date(log.sentAt || log.createdAt || '').toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent payment events (DevPaymentProvider)</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentEvents.length === 0 ? (
            <EmptyState title="No payment events" description="DevPaymentProvider has no events yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold">Tenant ID</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Period end</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEvents.map((evt) => (
                    <tr key={evt.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{evt.plan}</td>
                      <td className="py-3 px-4 font-mono text-xs">{evt.tenantId}</td>
                      <td className="py-3 px-4">
                        <Badge tone={evt.status === 'active' ? 'success' : 'warning'}>{evt.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {evt.currentPeriodEnd ? new Date(evt.currentPeriodEnd).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted">{evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sites overview</CardTitle>
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
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Slug</th>
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.tenantId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{site.tenant.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{site.tenant.slug}</td>
                      <td className="py-3 px-4">{site.tenant.plan || 'free'}</td>
                      <td className="py-3 px-4">
                        <Badge>{site.role}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/sites/${site.tenant.slug}`} className="text-primary hover:underline text-xs">
                          Open
                        </Link>
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
    </DevPanelLayout>
  );
}
