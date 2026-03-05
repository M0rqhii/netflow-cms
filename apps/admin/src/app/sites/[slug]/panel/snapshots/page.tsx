"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { timeAgo } from "@/lib/formatters";
import { createApiClient, type SiteInfo, type SiteSnapshot } from "@repo/sdk";

export default function SnapshotsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();
  const apiClient = useMemo(() => createApiClient(), []);

  const [siteName, setSiteName] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SiteSnapshot[]>([]);
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
        throw new Error(t("sitePanelShell.snapshotsUi.toasts.siteNotFound", { slug }));
      }
      setSiteName(site.site?.name || slug);
      setSiteId(site.siteId);
      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }
      const list = await apiClient.listSnapshots(token, site.siteId);
      setSnapshots(list || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("sitePanelShell.snapshotsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleCreateSnapshot = useCallback(async () => {
    if (!siteId) return;
    try {
      setCreating(true);
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }
      await apiClient.createSnapshot(token, siteId);
      toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.backupNowMock") });
      await loadSnapshots();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("sitePanelShell.snapshotsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setCreating(false);
    }
  }, [siteId, apiClient, toast, t, loadSnapshots]);

  const handleRestoreSnapshot = useCallback(async (snapshotId: string) => {
    if (!siteId) return;
    try {
      setRestoringId(snapshotId);
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }
      await apiClient.restoreSnapshot(token, siteId, snapshotId);
      toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.restoreMock") });
      await loadSnapshots();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("sitePanelShell.snapshotsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setRestoringId(null);
    }
  }, [siteId, apiClient, toast, t, loadSnapshots]);

  const latestSnapshot = snapshots
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="snapshots"
      title={t("sitePanelShell.snapshots.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.snapshots.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => void loadSnapshots()}>{t("sitePanelShell.actions.retention")}</button>
          <button className="btn btn-primary" type="button" disabled={!siteId || creating} onClick={() => void handleCreateSnapshot()}>
            {creating ? t("common.loading") : t("sitePanelShell.actions.runBackupNow")}
          </button>
        </>
      }
    >
      <div>

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.snapshotsUi.sections.policy")}</div>
            <div className="spacer-sm" />
            <div className="row-wrap">
              <span className="badge green">{t("sitePanelShell.snapshotsUi.labels.retention")}</span>
              <span className="badge gray">{t("sitePanelShell.snapshotsUi.sections.snapshots")}: {snapshots.length}</span>
              <span className="badge gray">
                {t("sitePanelShell.snapshotsUi.labels.schedule")} {latestSnapshot ? timeAgo(latestSnapshot.createdAt) : "-"}
              </span>
            </div>
            <div className="spacer-sm" />
            <div className="detail-label">
              {t("sitePanelShell.snapshotsUi.labels.policyHint")}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.snapshotsUi.sections.snapshots")}</div>
            <div className="spacer-sm" />
            {loading ? (
              <div className="text-muted">{t("common.loading")}</div>
            ) : snapshots.length === 0 ? (
              <div className="text-muted">{t("common.noResults")}</div>
            ) : (
              snapshots
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((b) => {
                  const stCls = "badge green";
                  return (
                    <div key={b.id} className="list-row">
                      <div className="min-w-0">
                        <div className="truncate project-name">{b.label || b.id}</div>
                        <div className="detail-label mt-2">
                          {timeAgo(b.createdAt)} - {b.id.slice(0, 8)}
                        </div>
                        <div className="tag-row">
                          <span className="badge gray">{t("sitePanelShell.snapshotsUi.labels.retentionShort")}</span>
                        </div>
                      </div>
                      <div className="row-wrap" style={{ alignItems: "center" }}>
                        <span className={stCls}>{t("sitePanelShell.snapshotsUi.labels.ok")}</span>
                        <button className="btn" type="button" disabled={restoringId === b.id} onClick={() => void handleRestoreSnapshot(b.id)}>
                          {restoringId === b.id ? t("common.loading") : t("sitePanelShell.snapshotsUi.actions.restore")}
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </SitePanelLayout>
  );
}

