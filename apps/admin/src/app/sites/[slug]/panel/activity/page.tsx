"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal } from "@repo/ui";
import { Badge } from "@/components/ui/Badge";
import { SiteEventsTable } from "@/components/site-panel/activity/SiteEventsTable";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { createApiClient, type SiteInfo } from "@repo/sdk";
import { useToast } from "@/components/ui/Toast";

export default function ActivityPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const apiClient = createApiClient();
  const toast = useToast();
  const t = useTranslations();

  const [siteId, setSiteId] = useState<string | null>(null);
  const [rows, setRows] = useState<import("@/components/site-panel/activity/SiteEventsTable").SiteEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<import("@/components/site-panel/activity/SiteEventsTable").SiteEventRow | null>(null);

  const loadEvents = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);
      if (!site) {
        throw new Error(t("sitePanelShell.activityUi.toasts.siteNotFound", { slug }));
      }
      setSiteId(site.siteId);
      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }
      const data = await apiClient.listSiteEvents(token, site.siteId, 50);
      const mapped = data.map((event) => ({
        id: event.id,
        type: event.type || "",
        message: event.message || "",
        metadata: event.metadata,
        createdAt: event.createdAt,
      }));
      setRows(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("sitePanelShell.activityUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = filterType === "all"
    ? rows
    : rows.filter((e) => e.type?.toLowerCase().includes(filterType.toLowerCase()));

  const handleExportCSV = () => {
    const headers = [t("sitePanelShell.activityUi.csv.date"), t("sitePanelShell.activityUi.csv.type"), t("sitePanelShell.activityUi.csv.message")];
    const rowsCsv = filteredEvents.map((e) => [
      new Date(e.createdAt).toLocaleString(),
      e.type || "",
      e.message || "",
    ]);

    const csv = [
      headers.join(","),
      ...rowsCsv.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${slug}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="activity"
      title={t("sitePanelShell.activity.title", { site: slug })}
      subtitle={t("sitePanelShell.activity.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={loadEvents} disabled={loading || !siteId}>{t("sitePanelShell.actions.refresh")}</button>
          <button className="btn primary" type="button" onClick={handleExportCSV} disabled={filteredEvents.length === 0}>{t("sitePanelShell.actions.exportCsv")}</button>
        </>
      }
    >
      <div>

        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div className="section-title">{t("sitePanelShell.activityUi.filters.title")}</div>
            <div className="row">
              <label className="detail-label font-black">{t("sitePanelShell.activityUi.filters.type")}</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
                style={{ width: 200 }}
              >
                <option value="all">{t("sitePanelShell.activityUi.filters.all")}</option>
                <option value="page">{t("sitePanelShell.activityUi.filters.page")}</option>
                <option value="publish">{t("sitePanelShell.activityUi.filters.publish")}</option>
                <option value="media">{t("sitePanelShell.activityUi.filters.media")}</option>
                <option value="seo">{t("sitePanelShell.activityUi.filters.seo")}</option>
                <option value="snapshot">{t("sitePanelShell.activityUi.filters.snapshot")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="spacer" />

        <div className="card card-pad">
          <SiteEventsTable
            events={filteredEvents}
            loading={loading}
            onEventClick={setSelectedEvent}
          />
        </div>

        <div className="spacer" />

        <div className="card card-pad text-muted">
          {t("sitePanelShell.activityUi.notes.autoEvents")}
        </div>

        {selectedEvent && (
          <Modal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            title={t("sitePanelShell.activityUi.modal.title")}
            size="lg"
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t("sitePanelShell.activityUi.modal.type")}</div>
                <Badge className="capitalize">{selectedEvent.type?.replace(/_/g, " ") || t("sitePanelShell.activityUi.modal.unknown")}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">{t("sitePanelShell.activityUi.modal.message") }</div>
                <div className="text-sm">{selectedEvent.message || t("sitePanelShell.activityUi.modal.noMessage")}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">{t("sitePanelShell.activityUi.modal.when")}</div>
                <div className="text-sm text-muted">{new Date(selectedEvent.createdAt).toLocaleString()}</div>
              </div>
              {selectedEvent.metadata !== undefined && selectedEvent.metadata !== null && (
                <div>
                  <div className="text-sm font-medium mb-1">{t("sitePanelShell.activityUi.modal.details")}</div>
                  <pre className="text-xs bg-surface-2 p-3 rounded-[14px] overflow-auto max-h-64">
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
