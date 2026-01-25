"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  LoadingSpinner,
  EmptyState,
} from '@repo/ui';
import { fetchOrgDashboard, type DashboardResponse } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default function OrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params?.orgId ?? '';
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboardData = await fetchOrgDashboard(orgId);
        setData(dashboardData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(message);
        push({
          tone: 'error',
          message,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgId, push]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-8">
        <EmptyState
          title="Failed to load dashboard"
          description={error || 'Unknown error'}
        />
      </div>
    );
  }

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  };

  const getStatusBadge = (status: 'LIVE' | 'DRAFT' | 'ERROR') => {
    const variants = {
      LIVE: 'success' as const,
      DRAFT: 'default' as const,
      ERROR: 'error' as const,
    };
    return <Badge tone={variants[status]}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'error' as const,
      medium: 'warning' as const,
      low: 'default' as const,
    };
    return <Badge tone={variants[severity]}>{severity.toUpperCase()}</Badge>;
  };

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: `Org ${orgId}` },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organization Dashboard</h1>
        <p className="text-sm text-muted">What do you have under control today?</p>
      </div>

      {/* Alerts Section */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityBadge(alert.severity)}
                        <span className="font-medium">{alert.message}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(alert.actionUrl)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Info Section (Owner only) */}
      {data.business && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{data.business.plan.name}</div>
                  <div className="text-sm text-muted">
                    <div>Pages: {data.business.plan.limits.maxPages === -1 ? 'Unlimited' : data.business.plan.limits.maxPages}</div>
                    <div>Users: {data.business.plan.limits.maxUsers === -1 ? 'Unlimited' : data.business.plan.limits.maxUsers}</div>
                    <div>Storage: {data.business.plan.limits.maxStorageMB === -1 ? 'Unlimited' : `${data.business.plan.limits.maxStorageMB}MB`}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/billing`)}
                  >
                    Upgrade
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage</span>
                      <span>{data.business.usage.storage.percent}%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(data.business.usage.storage.percent, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted">
                      {data.business.usage.storage.used}MB / {data.business.usage.storage.limit === -1 ? '∞' : `${data.business.usage.storage.limit}MB`}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>API Requests</span>
                      <span>{data.business.usage.apiRequests.percent}%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(data.business.usage.apiRequests.percent, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted">
                      {data.business.usage.apiRequests.used} / {data.business.usage.apiRequests.limit === -1 ? '∞' : data.business.usage.apiRequests.limit}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/usage`)}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted">Status</div>
                    <div className="font-medium">{data.business.billing.status}</div>
                  </div>
                  {data.business.billing.nextPayment && (
                    <div>
                      <div className="text-sm text-muted">Next Payment</div>
                      <div className="font-medium">
                        {new Date(data.business.billing.nextPayment).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/billing`)}
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Usage Info Section (Admin only, if no business) */}
      {!data.business && data.usage && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{data.usage.storage.percent}%</div>
                  <div className="text-sm text-muted">
                    {data.usage.storage.used}MB / {data.usage.storage.limit === -1 ? '∞' : `${data.usage.storage.limit}MB`}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/usage`)}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{data.usage.apiRequests.percent}%</div>
                  <div className="text-sm text-muted">
                    {data.usage.apiRequests.used} / {data.usage.apiRequests.limit === -1 ? '∞' : data.usage.apiRequests.limit}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/usage`)}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bandwidth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{data.usage.bandwidth.percent}%</div>
                  <div className="text-sm text-muted">
                    {data.usage.bandwidth.used} / {data.usage.bandwidth.limit === -1 ? '∞' : `${data.usage.bandwidth.limit}MB`}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/org/${orgId}/usage`)}
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Sites Section */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sites</CardTitle>
              <Button
                size="sm"
                onClick={() => router.push('/sites/new')}
              >
                + New Site
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.sites.length === 0 ? (
              <EmptyState
                title="No sites"
                description="Create your first site to get started"
              />
            ) : (
              <div className="space-y-4">
                {data.sites.map((site) => (
                  <div
                    key={site.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            href={`/sites/${site.slug}`}
                            className="font-semibold text-lg hover:underline"
                          >
                            {site.name}
                          </Link>
                          {getStatusBadge(site.status)}
                          {site.plan && (
                            <Badge variant="outline">{site.plan}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted space-y-1">
                          {site.domain ? (
                            <div>Domain: {site.domain}</div>
                          ) : (
                            <div className="text-amber-600">No domain</div>
                          )}
                          {site.lastDeploy && (
                            <div>
                              Last deploy: {formatTime(site.lastDeploy.time)} -{' '}
                              <span className={site.lastDeploy.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                                {site.lastDeploy.status}
                              </span>
                            </div>
                          )}
                        </div>
                        {site.alerts && site.alerts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {site.alerts.map((alert) => (
                              <div key={alert.id} className="text-sm text-amber-600">
                                ⚠️ {alert.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {site.quickActions.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {site.quickActions.map((action, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(action.url)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Section (Admin only) */}
      {data.quickAccess && data.quickAccess.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.quickAccess.map((item, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => router.push(item.url)}
                    className="h-auto py-4"
                  >
                    <div className="text-center">
                      <div className="font-semibold">{item.label}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Section (Owner only, optional) */}
      {data.activity && data.activity.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.activity.map((item) => (
                  <div key={item.id} className="text-sm border-b pb-2">
                    <div className="font-medium">{item.message}</div>
                    <div className="text-muted">{formatTime(item.time)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}





