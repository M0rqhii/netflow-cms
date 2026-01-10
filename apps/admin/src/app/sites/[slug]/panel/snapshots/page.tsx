"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent, Button, Input } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { SnapshotTable } from '@/components/site-panel/snapshots/SnapshotTable';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { createApiClient, type SiteInfo, type SiteSnapshot } from '@repo/sdk';

export default function SnapshotsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const apiClient = createApiClient();

  const [siteId, setSiteId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SiteSnapshot[]>([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);
      if (!site) {
        throw new Error(`Site with slug "${slug}" not found`);
      }
      setSiteId(site.siteId);
      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }
      const list = await apiClient.listSnapshots(token, site.siteId);
      setSnapshots(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load snapshots';
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleCreate = async () => {
    if (!siteId) return;
    setCreating(true);
    try {
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }
      await apiClient.createSnapshot(token, siteId, label.trim() || undefined);
      setLabel('');
      toast.push({ tone: 'success', message: 'Snapshot created' });
      await loadSnapshots();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create snapshot';
      toast.push({ tone: 'error', message });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (!siteId) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('This will revert your pages and SEO to the snapshot state. Continue?')
      : true;
    if (!confirmed) return;

    setRestoringId(snapshotId);
    try {
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }
      await apiClient.restoreSnapshot(token, siteId, snapshotId);
      toast.push({ tone: 'success', message: 'Snapshot restored' });
      await loadSnapshots();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore snapshot';
      toast.push({ tone: 'error', message });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Snapshots"
          description="Create JSON backups of your site pages, SEO, and feature flags. Restore to rewind changes."
          action={{ label: 'Create snapshot', onClick: handleCreate, disabled: creating || !siteId }}
        />

        <Card>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
              <div className="flex-1">
                <label className="block text-sm text-muted mb-1">Label (optional)</label>
                <Input
                  placeholder="e.g. Before homepage redesign"
                  value={label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
                  disabled={creating || loading}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !siteId}>
                {creating ? 'Saving�' : 'Create snapshot'}
              </Button>
            </div>
            <p className="text-xs text-muted">
              Snapshots capture all pages (draft + production), SEO settings, and feature overrides for this site.
            </p>
          </CardContent>
        </Card>

        <SnapshotTable
          snapshots={snapshots}
          loading={loading}
          restoringId={restoringId}
          onRestore={handleRestore}
        />
      </div>
    </SitePanelLayout>
  );
}
