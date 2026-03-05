"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { timeAgo } from "@/lib/formatters";
import { createApiClient } from "@repo/sdk";
import type { SiteInfo, SiteDeployment } from "@repo/sdk";

export default function DeploymentsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<SiteDeployment[]>([]);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const apiClient = useMemo(() => createApiClient(), []);

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
        throw new Error(t("sitePanelShell.deploymentsUi.toasts.siteNotFound", { slug }));
      }

      setSiteName(site.site?.name || slug);
      setSiteId(site.siteId);

      const id = site.siteId;
      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const deploymentsData = await apiClient.listDeployments(token, id);
      setDeployments(deploymentsData || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.deploymentsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = useCallback(async () => {
    if (!siteId) return;
    try {
      setPublishing(true);
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }
      await apiClient.publishSite(token, siteId);
      toast.push({ tone: "success", message: t("sitePanelShell.deploymentsUi.toasts.newDeploymentMock") });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.deploymentsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setPublishing(false);
    }
  }, [siteId, apiClient, toast, t, loadData]);

  const current = deployments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="deployments"
      title={t("sitePanelShell.deployments.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.deployments.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => void loadData()}>{t("sitePanelShell.actions.redeploy")}</button>
          <button className="btn btn-primary" type="button" disabled={publishing || loading || !siteId} onClick={() => void handlePublish()}>
            {publishing ? t("common.loading") : t("sitePanelShell.actions.newDeployment")}
          </button>
        </>
      }
    >
      <div>

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.deploymentsUi.sections.current")}</div>
            <div className="spacer-sm" />
            {current ? (
              <>
                <div className="row-wrap">
                  <span className="badge blue">{t("sitePanelShell.deploymentsUi.labels.env", { value: current.env })}</span>
                  <span className="badge green">{current.type || t("sitePanelShell.deploymentsUi.labels.deploy")}</span>
                  <span className="badge gray">{t("sitePanelShell.deploymentsUi.labels.sha", { value: current.id.slice(0, 7) })}</span>
                  <span className="badge gray">{t("sitePanelShell.deploymentsUi.labels.last", { value: timeAgo(current.createdAt) })}</span>
                </div>
                <div className="spacer-sm" />
                <div className="detail-label">
                  {t("sitePanelShell.deploymentsUi.labels.pipeline")}
                </div>
              </>
            ) : (
              <div className="text-muted">{t("sitePanelShell.deploymentsUi.states.noDeployments")}</div>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.deploymentsUi.sections.history")}</div>
            <div className="spacer-sm" />
            {loading ? (
              <div className="text-muted">{t("common.loading")}</div>
            ) : deployments.length === 0 ? (
              <div className="text-muted">{t("common.noResults")}</div>
            ) : (
              deployments
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((d) => {
                  const stCls = d.status === "success" ? "badge green" : d.status === "failed" ? "badge orange" : "badge gray";
                  return (
                    <div key={d.id} className="list-row">
                      <div className="min-w-0">
                        <div className="truncate project-name">
                          {(d.type || t("sitePanelShell.deploymentsUi.labels.deploy"))} - {d.env}
                        </div>
                        <div className="detail-label mt-2">
                          {timeAgo(d.createdAt)} - {d.id.slice(0, 7)}
                        </div>
                        <div className="tag-row">
                          <span className="badge gray">{d.message || t("sitePanelShell.deploymentsUi.labels.deploy")}</span>
                        </div>
                      </div>
                      <div className="row-wrap" style={{ alignItems: "center" }}>
                        <span className={stCls}>{d.status.toUpperCase()}</span>
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


