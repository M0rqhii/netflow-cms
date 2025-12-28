"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent, Button, Input } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { SiteEventsTable } from '@/components/site-panel/activity/SiteEventsTable';
import { fetchMyTenants, exchangeTenantToken, getTenantToken } from '@/lib/api';
import { createApiClient, type TenantInfo, type SiteEvent } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function ActivityPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const apiClient = createApiClient();
  const toast = useToast();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<SiteEvent | null>(null);

  const loadEvents = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const tenants = await fetchMyTenants();
      const tenant = tenants.find((t: TenantInfo) => t.tenant.slug === slug);
      if (!tenant) {
        throw new Error(`Site with slug "${slug}" not found`);
      }
      setTenantId(tenant.tenantId);
      let token = getTenantToken(tenant.tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenant.tenantId);
      }
      const data = await apiClient.listSiteEvents(token, tenant.tenantId, 50);
      setEvents(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load activity';
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.type?.toLowerCase().includes(filterType.toLowerCase()));

  const handleExportCSV = () => {
    const headers = ['When', 'Event Type', 'Message'];
    const rows = filteredEvents.map(e => [
      new Date(e.createdAt).toLocaleString(),
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
    a.download = `activity-${slug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Activity"
          description="Recent events for this site: pages, SEO updates, media uploads, and snapshots."
          action={{ label: 'Refresh', onClick: loadEvents, disabled: loading || !tenantId }}
        />

        {/* Filters */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter by type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="page">Pages</option>
                  <option value="publish">Publish</option>
                  <option value="media">Media</option>
                  <option value="seo">SEO</option>
                  <option value="snapshot">Snapshots</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredEvents.length === 0}>
                Export CSV
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
            <p>Events are logged automatically when editors publish pages, update SEO, manage media, or create snapshots.</p>
          </CardContent>
        </Card>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">Event Details</h2>
                  <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Event Type</div>
                    <Badge className="capitalize">{selectedEvent.type?.replace(/_/g, ' ') || 'Unknown'}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Message</div>
                    <div className="text-sm">{selectedEvent.message || 'No message'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">When</div>
                    <div className="text-sm text-muted">{new Date(selectedEvent.createdAt).toLocaleString()}</div>
                  </div>
                  {selectedEvent.metadata && (
                    <div>
                      <div className="text-sm font-medium mb-1">Details</div>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}
