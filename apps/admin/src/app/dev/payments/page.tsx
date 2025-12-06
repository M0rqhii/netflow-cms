"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { decodeAuthToken, getAuthToken, getDevPayments } from '@/lib/api';
import { LoadingSpinner } from '@repo/ui';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';

const PRIVILEGED_ROLES = ['super_admin', 'tenant_admin'];

export default function DevPaymentsPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole);
  const [payments, setPayments] = useState<
    Array<{ id: string; tenantId: string; plan: string; status: string; currentPeriodStart?: string; currentPeriodEnd?: string; createdAt?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevPayments()
      .then((data) => setPayments(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load payment events'))
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged]);

  if (isProd) {
    return (
      <div className="container py-10">
        <EmptyState title="Dev Panel disabled" description="Only available outside production." />
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Access denied"
          description="Only privileged users can access the Dev Panel."
          action={{ label: 'Back to dashboard', onClick: () => (window.location.href = '/dashboard') }}
        />
      </div>
    );
  }

  return (
    <DevPanelLayout
      title="Payments"
      description="Simulated subscriptions and payment events (DevPaymentProvider)"
    >

      <Card>
        <CardHeader>
          <CardTitle>Payment events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <LoadingSpinner text="Loading payment events..." />
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : payments.length === 0 ? (
            <EmptyState title="No payment events" description="DevPaymentProvider has no events yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-2">Plan</th>
                    <th className="py-2">Tenant ID</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Period end</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((evt) => (
                    <tr key={evt.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{evt.plan}</td>
                      <td className="py-2 font-mono text-xs">{evt.tenantId}</td>
                      <td className="py-2">
                        <Badge tone={evt.status === 'active' ? 'success' : 'warning'}>{evt.status}</Badge>
                      </td>
                      <td className="py-2">
                        {evt.currentPeriodEnd ? new Date(evt.currentPeriodEnd).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2">{evt.createdAt ? new Date(evt.createdAt).toLocaleString() : '—'}</td>
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
