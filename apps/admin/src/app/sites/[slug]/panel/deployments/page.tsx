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

  const current = deployments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="deployments"
      title={t("sitePanelShell.deployments.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.deployments.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.deploymentsUi.toasts.redeployMock") })}>{t("sitePanelShell.actions.redeploy")}</button>
          <button className="btn btn-primary" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.deploymentsUi.toasts.newDeploymentMock") })}>{t("sitePanelShell.actions.newDeployment")}</button>
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
                  <span className="badge green">{t("sitePanelShell.deploymentsUi.labels.version")}</span>
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
                          v1.0.0 - {d.env}
                        </div>
                        <div className="detail-label mt-2">
                          {timeAgo(d.createdAt)} - system - {d.id.slice(0, 7)} - 120s
                        </div>
                        <div className="tag-row">
                          <span className="badge gray">{d.message || t("sitePanelShell.deploymentsUi.labels.deploy")}</span>
                        </div>
                      </div>
                      <div className="row-wrap" style={{ alignItems: "center" }}>
                        <span className={stCls}>{d.status.toUpperCase()}</span>
                        <button className="btn" type="button">{t("sitePanelShell.deploymentsUi.actions.rollback")}</button>
                        <button className="btn" type="button">{t("sitePanelShell.deploymentsUi.actions.logs")}</button>
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


