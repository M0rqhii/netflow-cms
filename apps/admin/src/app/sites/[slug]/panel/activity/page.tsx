"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent, Button, Modal } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { SiteEventsTable } from '@/components/site-panel/activity/SiteEventsTable';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { createApiClient, type SiteInfo } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function ActivityPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const apiClient = createApiClient();
  const toast = useToast();

  const [siteId, setSiteId] = useState<string | null>(null);
  const [rows, setRows] = useState<import('@/components/site-panel/activity/SiteEventsTable').SiteEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<import('@/components/site-panel/activity/SiteEventsTable').SiteEventRow | null>(null);

  const loadEvents = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);
      if (!site) {
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
      }
      setSiteId(site.siteId);
      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }
      const data = await apiClient.listSiteEvents(token, site.siteId, 50);
      const rows = data.map((event) => ({
        id: event.id,
        type: event.type || '',
        message: event.message || '',
        metadata: event.metadata,
        createdAt: event.createdAt,
      }));
      setRows(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się pobrać aktywności';
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = filterType === 'all'
    ? rows
    : rows.filter((e) => e.type?.toLowerCase().includes(filterType.toLowerCase()));

  const handleExportCSV = () => {
    const headers = ['Data', 'Typ', 'Wiadomość'];
    const rows = filteredEvents.map(e => [
      new Date(e.createdAt).toLocaleString('pl-PL'),
      e.type || '',
      e.message || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aktywnosc-${slug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Aktywność"
          description="Ostatnie zdarzenia: publikacje, zmiany SEO, media i snapshoty."
          action={{ label: 'Odśwież', onClick: loadEvents, disabled: loading || !siteId }}
        />

        <Card>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filtruj wg typu:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">Wszystkie</option>
                  <option value="page">Strony</option>
                  <option value="publish">Publikacja</option>
                  <option value="media">Media</option>
                  <option value="seo">SEO</option>
                  <option value="snapshot">Snapshoty</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredEvents.length === 0}>
                Eksportuj CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SiteEventsTable
              events={filteredEvents}
              loading={loading}
              onEventClick={setSelectedEvent}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-sm text-muted">
            <p>Zdarzenia zapisują się automatycznie przy publikacji, zmianach SEO, zarządzaniu mediami oraz snapshotach.</p>
          </CardContent>
        </Card>

        {selectedEvent && (
          <Modal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            title="Szczegóły zdarzenia"
            size="lg"
          >
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Typ</div>
                <Badge className="capitalize">{selectedEvent.type?.replace(/_/g, ' ') || 'Nieznany'}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Wiadomość</div>
                <div className="text-sm">{selectedEvent.message || 'Brak wiadomości'}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Kiedy</div>
                <div className="text-sm text-muted">{new Date(selectedEvent.createdAt).toLocaleString('pl-PL')}</div>
              </div>
              {(selectedEvent.metadata !== undefined && selectedEvent.metadata !== null) && (
                <div>
                  <div className="text-sm font-medium mb-1">Szczegóły</div>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}
