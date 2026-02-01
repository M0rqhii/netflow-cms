"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { PlaceholderCard } from '@/components/site-panel/PlaceholderCard';
import { Card, CardHeader, CardTitle, CardContent, Button, EmptyState, Modal } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { useParams, useRouter } from 'next/navigation';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { SiteInfo, SiteDeployment, SitePage } from '@repo/sdk';
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
  const [pages, setPages] = useState<SitePage[]>([]);
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
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
      }

      const id = site.siteId;
      setSiteId(id);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const [deployment, pagesResponse, media] = await Promise.all([
        apiClient.getLatestDeployment(token, id, 'production'),
        apiClient.listPages(token, id, { environmentType: 'draft' }),
        apiClient.listSiteMedia(token, id),
      ]);

      setLastDeployment(deployment);
      setPages(pagesResponse);
      setMediaFilesCount(media.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się pobrać danych';
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

    if (pages.length === 0) {
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
        message: 'Wszystkie strony opublikowane pomyślnie',
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się opublikować stron';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const siteName = slug || 'Strona';
  const sitePlan = 'Pro';
  const pagesCount = pages.length;
  const draftCount = pages.filter((p) => p.status === 'draft').length;
  const publishedCount = pages.filter((p) => p.status === 'published').length;

  const latestPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [pages]);

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Przegląd"
          description="Najważniejsze informacje o stronie i szybkie akcje."
        />

        <Card>
          <CardHeader>
            <CardTitle>Informacje o stronie</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted mb-1">Nazwa strony</dt>
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
                  <Badge tone="success">Aktywna</Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Strony</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagesCount}</div>
              <p className="text-sm text-muted mt-1">Łączna liczba stron</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mediaFilesCount}</div>
              <p className="text-sm text-muted mt-1">Wgrane pliki multimedialne</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ostatnia publikacja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {lastDeployment ? formatDate(lastDeployment.createdAt) : 'Brak publikacji'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted">Najświeższy deploy na produkcję</p>
                {lastDeployment?.status && (
                  <Badge tone={lastDeployment.status === 'success' ? 'success' : 'error'}>
                    {lastDeployment.status === 'success' ? 'Sukces' : 'Błąd'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Tooltip content={pagesCount === 0 ? 'Utwórz stronę, aby otworzyć kreator' : undefined}>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={pagesCount === 0}
                  onClick={() => {
                    if (pagesCount === 1 && pages[0]) {
                      router.push(`/sites/${slug}/panel/page-builder?pageId=${pages[0].id}`);
                    } else if (pagesCount > 1) {
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
                  Otwórz kreator
                </Button>
              </Tooltip>

              <Tooltip content={pagesCount === 0 ? 'Utwórz pierwszą stronę w sekcji Strony' : undefined}>
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
                  Utwórz stronę
                </Button>
              </Tooltip>

              <Tooltip content={pagesCount === 0 ? 'Dodaj stronę, aby móc publikować' : undefined}>
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
                  {publishing ? 'Publikowanie...' : 'Opublikuj wszystko'}
                </Button>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wersje robocze</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Nieopublikowane szkice</span>
                  <Badge tone="warning">{draftCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Strony w edycji</span>
                  <Badge>{pagesCount}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produkcja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Opublikowane strony</span>
                  <Badge tone="success">{publishedCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Ostatni deploy</span>
                  <span className="text-sm text-muted">
                    {lastDeployment ? formatDate(lastDeployment.createdAt) : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ostatnio modyfikowane</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPages.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Nie masz jeszcze żadnych stron"
                  description="Utwórz pierwszą stronę, aby rozpocząć budowanie."
                  action={{
                    label: 'Utwórz pierwszą stronę',
                    onClick: () => router.push(`/sites/${slug}/panel/pages`),
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {latestPages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                    <div>
                      <div className="font-medium">{page.title || 'Bez tytułu'}</div>
                      <div className="text-xs text-muted mt-1">
                        Ostatnia zmiana: {formatDate(page.updatedAt)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`)}
                    >
                      Otwórz
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktywność</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderCard>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Historia aktywności pojawi się tutaj</div>
                    <div className="text-xs text-muted">Ostatnie zmiany i działania w projekcie</div>
                  </div>
                </div>
              </div>
            </PlaceholderCard>
          </CardContent>
        </Card>

        <Modal
          isOpen={showPageSelector}
          onClose={() => setShowPageSelector(false)}
          title="Wybierz stronę do edycji"
          size="sm"
        >
          <div className="space-y-3">
            {pages.map((page) => (
              <button
                key={page.id}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setShowPageSelector(false);
                  router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`);
                }}
              >
                <div className="font-medium">{page.title || 'Bez tytułu'}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPageSelector(false)}>
              Anuluj
            </Button>
            <Button variant="primary" onClick={() => router.push(`/sites/${slug}/panel/pages`)}>
              Zarządzaj stronami
            </Button>
          </div>
        </Modal>
      </div>
    </SitePanelLayout>
  );
}
