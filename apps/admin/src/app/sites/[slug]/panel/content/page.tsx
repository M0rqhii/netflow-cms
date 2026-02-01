"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent, EmptyState, LoadingSpinner, Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { fetchMySites, fetchSiteCollections, fetchContentEntries } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import type { CollectionSummary } from '@/lib/api';

export default function ContentPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

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
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
      }

      const collectionsData = await fetchSiteCollections(site.siteId);
      setCollections(collectionsData);

      if (collectionsData.length > 0) {
        const totals = await Promise.all(
          collectionsData.map(async (collection) => {
            try {
              const result = await fetchContentEntries(site.siteId, collection.slug, { page: 1, pageSize: 1 });
              return [collection.slug, result.total] as const;
            } catch {
              return [collection.slug, 0] as const;
            }
          })
        );
        setCounts(Object.fromEntries(totals));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się pobrać treści';
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalEntries = useMemo(() => {
    return Object.values(counts).reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
  }, [counts]);

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text="Wczytywanie treści..." />
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Treści"
          description="Zarządzaj wpisami i danymi z kolekcji."
          action={{
            label: 'Nowa kolekcja',
            onClick: () => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections`),
          }}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted">Kolekcje</div>
              <div className="text-2xl font-semibold mt-1">{collections.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted">Łącznie wpisów</div>
              <div className="text-2xl font-semibold mt-1">{totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted">Strona</div>
              <div className="text-base font-semibold mt-1">{slug}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            {collections.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Brak kolekcji"
                  description="Utwórz pierwszą kolekcję, aby zacząć zarządzać treściami."
                  action={{
                    label: 'Utwórz kolekcję',
                    onClick: () => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections`),
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {collections.map((collection) => (
                  <Card key={collection.id} className="border border-border/60">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-muted">Kolekcja</div>
                          <div className="text-lg font-semibold">{collection.name}</div>
                          <div className="text-xs text-muted mt-1">Slug: {collection.slug}</div>
                        </div>
                        <Badge tone="default">{counts[collection.slug] ?? 0} wpisów</Badge>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections/${collection.slug}`)}
                        >
                          Zobacz wpisy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections`)}
                        >
                          Edytuj schemat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
