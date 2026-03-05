"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal, Button } from "@repo/ui";
import { Tooltip } from "@/components/ui/Tooltip";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { createApiClient } from "@repo/sdk";
import type { SiteInfo, SiteDeployment, SitePage } from "@repo/sdk";
import { useToast } from "@/components/ui/Toast";
import { timeAgo, fmtBytes, statusToBadge } from "@/lib/formatters";

function StatCard({ title, value, meta, badgeClass, badgeText }: {
  title: string;
  value: string;
  meta: string;
  badgeClass: string;
  badgeText: string;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="detail-label">{title}</div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight">{value}</div>
          <div className="mt-2 text-xs text-muted uppercase tracking-[0.08em] font-bold">{meta}</div>
        </div>
        <span className={badgeClass}>{badgeText}</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
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
        throw new Error(t("sitePanelShell.overviewUi.toasts.siteNotFound", { slug }));
      }

      const id = site.siteId;
      setSiteId(id);
      setSiteInfo(site);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const [deployment, pagesResponse, media] = await Promise.all([
        apiClient.getLatestDeployment(token, id, "production"),
        apiClient.listPages(token, id, { environmentType: "draft" }),
        apiClient.listSiteMedia(token, id),
      ]);

      setLastDeployment(deployment);
      setPages(pagesResponse);
      setMediaFilesCount(media.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.overviewUi.toasts.loadError");
      toast.push({
        tone: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublishAll = async () => {
    if (!siteId) return;

    if (pages.length === 0) {
      toast.push({
        tone: "error",
        message: t("sitePanelShell.overviewUi.toasts.addPageBeforePublish"),
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
        tone: "success",
        message: t("sitePanelShell.overviewUi.toasts.publishSuccess"),
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.overviewUi.toasts.publishError");
      toast.push({
        tone: "error",
        message,
      });
    } finally {
      setPublishing(false);
    }
  };

  const siteName = siteInfo?.site?.name || slug || t("sitePanelShell.overviewUi.labels.site");
  const siteDomain = siteInfo?.site?.slug || slug || "";
  const sitePlan = siteInfo?.site?.plan || "pro";

  const pagesCount = pages.length;
  const draftCount = pages.filter((p) => p.status === "draft").length;
  const publishedCount = pages.filter((p) => p.status === "published").length;

  const latestPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [pages]);

  const [planText, planBadge] = statusToBadge(sitePlan);
  const [statusText, statusBadge] = statusToBadge("active");

  const storage = fmtBytes(mediaFilesCount * 6 * 1024 * 1024);
  const bandwidth = fmtBytes(Math.max(1, pagesCount) * 180 * 1024 * 1024);

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="overview"
      title={t("sitePanelShell.overview.title", { site: siteName })}
      subtitle={t("sitePanelShell.overview.subtitle", { domain: siteDomain })}
      actions={
        <>
          <Link className="btn" href={`/sites/${slug}/panel/pages`}>{t("sitePanelShell.actions.goToPages")}</Link>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              if (pagesCount === 1 && pages[0]) {
                router.push(`/sites/${slug}/panel/page-builder?pageId=${pages[0].id}`);
              } else if (pagesCount > 1) {
                setShowPageSelector(true);
              } else {
                toast.push({ tone: "error", message: t("sitePanelShell.overviewUi.toasts.addPageBeforeBuilder") });
              }
            }}
          >{t("sitePanelShell.actions.openBuilder")}</button>
        </>
      }
    >
      <div className="space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            title={t("sitePanelShell.overviewUi.labels.status")}
            value={statusText}
            meta={t("sitePanelShell.overviewUi.labels.uptime")}
            badgeClass={statusBadge}
            badgeText={statusText}
          />
          <StatCard
            title={t("sitePanelShell.overviewUi.labels.identity")}
            value={siteDomain}
            meta={t("sitePanelShell.overviewUi.labels.site")}
            badgeClass={planBadge}
            badgeText={planText}
          />
          <StatCard
            title={t("sitePanelShell.overviewUi.labels.build")}
            value="v1.0.0"
            meta={t("sitePanelShell.overviewUi.labels.lastDeploy", { value: lastDeployment ? timeAgo(lastDeployment.createdAt) : "-" })}
            badgeClass="badge gray"
            badgeText="build"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.overviewUi.sections.usage")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge gray">{t("sitePanelShell.overviewUi.labels.storage", { value: storage })}</span>
              <span className="badge gray">{t("sitePanelShell.overviewUi.labels.bandwidth", { value: bandwidth })}</span>
              <span className="badge gray">{t("sitePanelShell.overviewUi.labels.pages", { count: pagesCount })}</span>
            </div>
            <div className="mt-3 detail-label normal-case tracking-normal text-muted font-semibold">
              {t("sitePanelShell.overviewUi.labels.usageHint")}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.overviewUi.sections.ops")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge blue">{t("sitePanelShell.overviewUi.labels.dns")}</span>
              <span className="badge green">{t("sitePanelShell.overviewUi.labels.ssl")}</span>
              <span className="badge gray">{t("sitePanelShell.overviewUi.labels.cdn")}</span>
              <span className="badge gray">{t("sitePanelShell.overviewUi.labels.backups")}</span>
            </div>
            <div className="mt-3 detail-label normal-case tracking-normal text-muted font-semibold">
              {t("sitePanelShell.overviewUi.labels.opsHint")}
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-header">
            <div className="section-title">{t("sitePanelShell.overviewUi.sections.recent")}</div>
            <div className="section-link">{t("sitePanelShell.overviewUi.labels.draftsPublished", { draft: draftCount, published: publishedCount })}</div>
          </div>

          <div className="mt-3 space-y-3">
            {latestPages.length === 0 ? (
              <div className="text-muted">{t("common.noResults")}</div>
            ) : (
              latestPages.map((page) => (
                <div key={page.id} className="card tight card-pad">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="project-name truncate">{page.title || t("sitePanelShell.overviewUi.labels.untitled")}</div>
                      <div className="detail-label mt-1 normal-case tracking-normal text-muted font-semibold">
                        {t("sitePanelShell.overviewUi.labels.lastChange", { value: timeAgo(page.updatedAt) })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`)}
                    >{t("sitePanelShell.overviewUi.actions.open")}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">{t("sitePanelShell.overviewUi.sections.quickActions")}</div>
          <div className="mt-3 space-y-2">
            <Tooltip content={pagesCount === 0 ? t("sitePanelShell.overviewUi.tooltips.createPageToOpenBuilder") : undefined}>
              <button
                className="btn btn-full"
                type="button"
                onClick={() => {
                  if (pagesCount === 1 && pages[0]) {
                    router.push(`/sites/${slug}/panel/page-builder?pageId=${pages[0].id}`);
                  } else if (pagesCount > 1) {
                    setShowPageSelector(true);
                  }
                }}
                disabled={pagesCount === 0}
              >{t("sitePanelShell.overviewUi.actions.openBuilder")}</button>
            </Tooltip>
            <button className="btn btn-full" type="button" onClick={() => router.push(`/sites/${slug}/panel/pages`)}>{t("sitePanelShell.overviewUi.actions.createPage")}</button>
            <button
              className="btn primary btn-full"
              type="button"
              onClick={handlePublishAll}
              disabled={publishing || loading || pagesCount === 0}
            >
              {publishing ? t("sitePanelShell.overviewUi.actions.publishing") : t("sitePanelShell.overviewUi.actions.publishAll")}
            </button>
          </div>
        </div>

        <Modal
          isOpen={showPageSelector}
          onClose={() => setShowPageSelector(false)}
          title={t("sitePanelShell.overviewUi.modals.selectPageTitle")}
          size="sm"
        >
          <div className="space-y-3">
            {pages.map((page) => (
              <button
                key={page.id}
                className="w-full text-left px-4 py-3 rounded-[18px] border border-border hover:border-primary/50 hover:bg-[var(--hover)] transition-colors"
                onClick={() => {
                  setShowPageSelector(false);
                  router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`);
                }}
              >
                <div className="font-medium">{page.title || t("sitePanelShell.overviewUi.labels.untitled")}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowPageSelector(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={() => router.push(`/sites/${slug}/panel/pages`)}>{t("sitePanelShell.overviewUi.actions.managePages")}</Button>
          </div>
        </Modal>
      </div>
    </SitePanelLayout>
  );
}
