"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { decodeAuthToken, getAuthToken, getDevEmails } from '@/lib/api';
import { LoadingSpinner } from '@repo/ui';
import { DevPanelLayout } from '@/components/dev-panel/DevPanelLayout';

const PRIVILEGED_ROLES = ['super_admin', 'org_admin', 'site_admin'];
const PRIVILEGED_PLATFORM_ROLES = ['platform_admin'];

export default function DevEmailsPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isProd = appProfile === 'production';
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || '';
  const userPlatformRole = (payload?.platformRole as string) || '';
  const isPrivileged = 
    PRIVILEGED_ROLES.includes(userRole) || 
    PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);
  const [logs, setLogs] = useState<Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; createdAt?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevEmails()
      .then((data) => setLogs(data))
      .catch((e) => {
        // Don't show error for 403 Forbidden - user will see access denied message
        const isForbidden = e instanceof Error && 
          (e.message.includes('403') || 
           e.message.includes('Forbidden') ||
           e.message.includes('Insufficient permissions'));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : 'Failed to load email logs');
        }
      })
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
    <DevPanelLayout title="Email Logs" description="Recent dev emails (DevMailer)">

      <Card>
        <CardHeader>
          <CardTitle>Email log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <LoadingSpinner text="Loading email logs..." />
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : logs.length === 0 ? (
            <EmptyState title="No email logs" description="DevEmailLog has no entries yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-2">Recipient</th>
                    <th className="py-2">Subject</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-2">{log.to}</td>
                      <td className="py-2">{log.subject}</td>
                      <td className="py-2">
                        <Badge tone={log.status === 'sent' ? 'success' : 'warning'}>{log.status}</Badge>
                      </td>
                      <td className="py-2">{new Date(log.sentAt || log.createdAt || '').toLocaleString()}</td>
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
