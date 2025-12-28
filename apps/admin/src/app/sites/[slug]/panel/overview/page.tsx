"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { PlaceholderCard } from '@/components/site-panel/PlaceholderCard';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@repo/ui';
import { useParams } from 'next/navigation';
import { fetchMyTenants, exchangeTenantToken, getTenantToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { TenantInfo, SiteDeployment } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function OverviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [lastDeployment, setLastDeployment] = useState<SiteDeployment | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [mediaFilesCount, setMediaFilesCount] = useState(0);

  const apiClient = createApiClient();

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const tenants = await fetchMyTenants();
      const tenant = tenants.find((t: TenantInfo) => t.tenant.slug === slug);

      if (!tenant) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = tenant.tenantId;
      setTenantId(id);

      let token = getTenantToken(id);
      if (!token) {
        token = await exchangeTenantToken(id);
      }

      const [deployment, pages, media] = await Promise.all([
        apiClient.getLatestDeployment(token, id, 'production'),
        apiClient.listPages(token, id, { environmentType: 'draft' }),
        apiClient.listSiteMedia(token, id),
      ]);

      setLastDeployment(deployment);
      setPagesCount(pages.length);
      setMediaFilesCount(media.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublishAll = async () => {
    if (!tenantId) return;

    try {
      setPublishing(true);

      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.publishSite(token, tenantId);

      toast.push({
        tone: 'success',
        message: 'All pages published successfully',
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish pages';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const siteName = slug || 'Site Name';
  const sitePlan = 'Pro';
  const stats = {
    pages: pagesCount.toString(),
    mediaFiles: mediaFilesCount.toString(),
    lastPublished: lastDeployment
      ? formatDate(lastDeployment.createdAt)
      : 'Not published yet',
    lastPublishStatus: lastDeployment?.status || null,
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        {/* Site Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted mb-1">Site Name</dt>
                <dd className="font-medium">{siteName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted mb-1">Slug</dt>
                <dd className="font-mono text-sm">{slug}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted mb-1">Plan</dt>
                <dd>
                  <Badge>{sitePlan}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted mb-1">Status</dt>
                <dd>
                  <Badge tone="success">Active</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Quick Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pages}</div>
              <p className="text-sm text-muted mt-1">Total pages</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mediaFiles}</div>
              <p className="text-sm text-muted mt-1">Uploaded files</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{stats.lastPublished}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted">Most recent production publish</p>
                {stats.lastPublishStatus && (
                  <Badge tone={stats.lastPublishStatus === 'success' ? 'success' : 'error'}>
                    {stats.lastPublishStatus === 'success' ? 'Success' : 'Failed'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button variant="outline" className="w-full" disabled>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                    <path d="M5 5h10v10H5z" />
                    <path d="M5 10h10M10 5v10" strokeLinecap="round" />
                  </svg>
                </span>
                Open Builder
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                    <rect x="4" y="4" width="10" height="12" rx="1.5" />
                    <path d="M7 8h5M7 11h4" strokeLinecap="round" />
                  </svg>
                </span>
                Create Page
              </Button>
              <Button
                variant="primary"
                className="w-full"
                onClick={handlePublishAll}
                disabled={publishing || loading}
              >
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                    <path d="M5 4.5h10a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
                    <path d="M6.5 7h7M6.5 10h7M6.5 13h4" strokeLinecap="round" />
                  </svg>
                </span>
                {publishing ? 'Publishing...' : 'Publish All'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Draft vs Production State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Draft State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Unpublished drafts</span>
                  <Badge tone="warning">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Draft pages</span>
                  <Badge>0</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Production State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Published pages</span>
                  <Badge tone="success">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Last production publish</span>
                  <span className="text-sm text-muted">
                    {lastDeployment ? formatDate(lastDeployment.createdAt) : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Modified Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Modified Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No pages yet"
              description="No pages yet. Create a page to start building your site."
            />
          </CardContent>
        </Card>

        {/* Activity Log Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderCard>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Activity log will appear here</div>
                    <div className="text-xs text-muted">Recent changes and updates</div>
                  </div>
                </div>
              </div>
            </PlaceholderCard>
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}

