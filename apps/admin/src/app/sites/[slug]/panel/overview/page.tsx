"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { PlaceholderCard } from '@/components/site-panel/PlaceholderCard';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { EmptyState } from '@repo/ui';
import { useParams, useRouter } from 'next/navigation';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { SiteInfo, SiteDeployment } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function OverviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [lastDeployment, setLastDeployment] = useState<SiteDeployment | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [pages, setPages] = useState<{ id: string; title: string }[]>([]);
  const [mediaFilesCount, setMediaFilesCount] = useState(0);
  const [showPageSelector, setShowPageSelector] = useState(false);

  const apiClient = createApiClient();

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = site.siteId;
      setSiteId(id);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const [deployment, pages, media] = await Promise.all([
        apiClient.getLatestDeployment(token, id, 'production'),
        apiClient.listPages(token, id, { environmentType: 'draft' }),
        apiClient.listSiteMedia(token, id),
      ]);

      setLastDeployment(deployment);
      setPagesCount(pages.length);
      setPages(pages.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
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
    if (!siteId) return;

    // GUARDRAIL: Nie pozwól publikować jeśli brak pages
    if (pagesCount === 0) {
      toast.push({
        tone: 'error',
        message: 'Dodaj przynajmniej jedną stronę, aby opublikować.',
      });
      return;
    }

    try {
      setPublishing(true);

      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.publishSite(token, siteId);

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
              
              {/* Open Builder - DISABLED jeśli brak pages, pokazuje selector jeśli wiele stron */}
              <Tooltip content={pagesCount === 0 ? "Utwórz stronę, aby otworzyć builder" : undefined}>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={pagesCount === 0}
                  onClick={() => {
                    if (pagesCount === 1 && pages[0]) {
                      // Jedna strona - otwórz ją bezpośrednio
                      router.push(`/sites/${slug}/panel/page-builder?pageId=${pages[0].id}`);
                    } else if (pagesCount > 1) {
                      // Więcej stron - pokaż selector
                      setShowPageSelector(true);
                    }
                  }}
                >
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                      <path d="M5 5h10v10H5z" />
                      <path d="M5 10h10M10 5v10" strokeLinecap="round" />
                    </svg>
                  </span>
                  Open Builder
                </Button>
              </Tooltip>

              {/* Create Page - Przekieruj do /pages */}
              <Tooltip content={pagesCount === 0 ? "Utwórz pierwszą stronę w sekcji Pages" : undefined}>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => router.push(`/sites/${slug}/panel/pages`)}
                >
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                      <rect x="4" y="4" width="10" height="12" rx="1.5" />
                      <path d="M7 8h5M7 11h4" strokeLinecap="round" />
                    </svg>
                  </span>
                  Create Page
                </Button>
              </Tooltip>

              {/* Publish All - DISABLED jeśli brak pages */}
              <Tooltip content={pagesCount === 0 ? "Dodaj stronę, aby móc publikować" : undefined}>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePublishAll}
                  disabled={publishing || loading || pagesCount === 0}
                >
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                      <path d="M5 4.5h10a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
                      <path d="M6.5 7h7M6.5 10h7M6.5 13h4" strokeLinecap="round" />
                    </svg>
                  </span>
                  {publishing ? 'Publishing...' : 'Publish All'}
                </Button>
              </Tooltip>
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
            <div className="py-12">
              <EmptyState
                title="Nie masz jeszcze żadnych stron"
                description="Utwórz pierwszą stronę, aby rozpocząć budowanie"
                action={{
                  label: "Utwórz pierwszą stronę",
                  onClick: () => router.push(`/sites/${slug}/panel/pages`),
                }}
              />
            </div>
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

        {/* Page Selector Modal */}
        {showPageSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Select a page to edit</h2>
              <div className="space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      setShowPageSelector(false);
                      router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`);
                    }}
                  >
                    <div className="font-medium">{page.title || 'Untitled Page'}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPageSelector(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => router.push(`/sites/${slug}/panel/pages`)}>
                  Manage Pages
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}
