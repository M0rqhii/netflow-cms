"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { PlaceholderCard } from '@/components/site-panel/PlaceholderCard';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@repo/ui';
import { useParams } from 'next/navigation';

export default function OverviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  // Placeholder data - will be replaced with real data later
  const siteName = slug || 'Site Name';
  const sitePlan = 'Pro';
  const stats = {
    pages: '—',
    mediaFiles: '—',
    lastPublished: '—',
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
              <div className="text-2xl font-bold">{stats.lastPublished}</div>
              <p className="text-sm text-muted mt-1">Most recent update</p>
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
                Open Page Builder
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Manage Redirects
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Publishing Settings
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
                  <span className="text-sm text-muted">Unpublished changes</span>
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
                  <span className="text-sm text-muted">Last deployment</span>
                  <span className="text-sm text-muted">—</span>
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
              description="Page Builder coming soon. You'll be able to create and manage pages here."
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

