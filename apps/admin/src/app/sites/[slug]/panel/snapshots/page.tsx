"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { timeAgo, fmtBytes } from "@/lib/formatters";
import { createApiClient, type SiteInfo, type SiteSnapshot } from "@repo/sdk";

export default function SnapshotsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();
  const apiClient = useMemo(() => createApiClient(), []);

  const [siteName, setSiteName] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SiteSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="snapshots"
      title={t("sitePanelShell.snapshots.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.snapshots.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.retentionMock") })}>{t("sitePanelShell.actions.retention")}</button>
          <button className="btn btn-primary" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.backupNowMock") })}>{t("sitePanelShell.actions.runBackupNow")}</button>
        </>
      }
    >
      <div>

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.snapshotsUi.sections.policy")}</div>
            <div className="spacer-sm" />
            <div className="row-wrap">
              <span className="badge green">{t("sitePanelShell.snapshotsUi.labels.schedule")}</span>
              <span className="badge blue">{t("sitePanelShell.snapshotsUi.labels.window")}</span>
              <span className="badge gray">{t("sitePanelShell.snapshotsUi.labels.retention")}</span>
              <span className="badge gray">{t("sitePanelShell.snapshotsUi.labels.encryption")}</span>
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
                          {timeAgo(b.createdAt)} - eu-central-1 - Daily
                        </div>
                        <div className="tag-row">
                          <span className="badge gray">{t("sitePanelShell.snapshotsUi.labels.size", { value: fmtBytes(280 * 1024 * 1024) })}</span>
                          <span className="badge gray">{t("sitePanelShell.snapshotsUi.labels.retentionShort")}</span>
                        </div>
                      </div>
                      <div className="row-wrap" style={{ alignItems: "center" }}>
                        <span className={stCls}>{t("sitePanelShell.snapshotsUi.labels.ok")}</span>
                        <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.restoreMock") })}>{t("sitePanelShell.snapshotsUi.actions.restore")}</button>
                        <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.snapshotsUi.toasts.downloadMock") })}>{t("sitePanelShell.snapshotsUi.actions.download")}</button>
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

