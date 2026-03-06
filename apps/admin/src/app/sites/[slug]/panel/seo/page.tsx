"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, getSeoSettings, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { timeAgo, clamp } from "@/lib/formatters";
import { createApiClient, type SiteInfo, type SitePage, type SeoSettings } from "@repo/sdk";
import { SeoForm } from "@/components/site-seo/SeoForm";

export default function SEOPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [seoSettings, setSeoSettings] = useState<SeoSettings | null>(null);
  const [openSeo, setOpenSeo] = useState(false);
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
      if (!site) throw new Error(t("sitePanelShell.seoUi.toasts.siteNotFound", { slug }));
      setSiteName(site.site?.name || slug);

      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }

      const [seo, pagesData] = await Promise.all([
        getSeoSettings(site.siteId).catch(() => null),
        apiClient.listPages(token, site.siteId, { environmentType: "draft" }).catch(() => []),
      ]);

      setSeoSettings(seo);
      setPages(Array.isArray(pagesData) ? pagesData : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.seoUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast, apiClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const checklist = [
    { label: t("sitePanelShell.seoUi.checklist.metaTitle"), ok: Boolean(seoSettings?.title?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.metaDescription"), ok: Boolean(seoSettings?.description?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.openGraphTitle"), ok: Boolean(seoSettings?.ogTitle?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.openGraphDescription"), ok: Boolean(seoSettings?.ogDescription?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.openGraphImage"), ok: Boolean(seoSettings?.ogImage?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.twitterCard"), ok: Boolean(seoSettings?.twitterCard?.trim()) },
    { label: t("sitePanelShell.seoUi.checklist.atLeastOnePage"), ok: pages.length > 0 },
    { label: t("sitePanelShell.seoUi.checklist.publishedPage"), ok: pages.some((page) => String(page.status).toLowerCase() === "published") },
  ];

  const ok = checklist.filter((x) => x.ok).length;
  const total = checklist.length;
  const pct = clamp(Math.round((ok / total) * 100), 0, 100);

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="card card-pad text-muted">{t("common.loading")}</div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="marketing"
      title={t("sitePanelShell.seo.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.seo.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => void loadData().then(() => toast.push({ tone: "success", message: t("sitePanelShell.seoUi.toasts.runAudit") }))}>{t("sitePanelShell.actions.runAudit")}</button>
          <button className="btn btn-primary" type="button" onClick={() => setOpenSeo(true)}>{t("sitePanelShell.actions.applyFixes")}</button>
        </>
      }
    >
      <div>

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="row-between">
              <div className="section-title">{t("sitePanelShell.seoUi.sections.health")}</div>
              <span className={`badge ${pct >= 85 ? "green" : pct >= 70 ? "blue" : "orange"}`}>{pct}%</span>
            </div>
            <div className="spacer-sm" />
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="spacer-sm" />
            <div className="detail-label">
              {t("sitePanelShell.seoUi.sections.checklistOk", { ok, total })}
            </div>
            <div className="spacer-sm" />
            {checklist.map((c) => {
              const cls = c.ok ? "badge green" : "badge orange";
              return (
                <div key={c.label} className="row-between list-row">
                  <div className="font-black">{c.label}</div>
                  <span className={cls}>{c.ok ? t("sitePanelShell.seoUi.status.ok") : t("sitePanelShell.seoUi.status.attn")}</span>
                </div>
              );
            })}
          </div>

          <div className="card card-pad">
            <div className="row-between">
              <div className="section-title">{t("sitePanelShell.seoUi.sections.pages")}</div>
              <span className="badge gray">{pages.length}</span>
            </div>
            <div className="spacer-sm" />
            {pages.map((p) => {
              const status = String(p.status || "").toLowerCase();
              const indexable = status === "published";
              const issues = Number(!seoSettings?.title) + Number(!seoSettings?.description) + Number(!indexable);
              const score = clamp(100 - issues * 20, 0, 100);
              const scoreCls = score >= 85 ? "badge green" : score >= 70 ? "badge blue" : "badge orange";
              return (
                <div key={p.slug} className="list-row">
                  <div className="min-w-0">
                    <div className="truncate project-name">{p.title || p.slug}</div>
                    <div className="detail-label mt-2">
                      {p.slug} - {t("sitePanelShell.seoUi.sections.updated", { time: timeAgo(p.updatedAt) })}
                    </div>
                    <div className="tag-row">
                      <span className="badge gray">{t("sitePanelShell.seoUi.sections.index", { value: indexable ? t("sitePanelShell.seoUi.status.yes") : t("sitePanelShell.seoUi.status.no") })}</span>
                      <span className="badge gray">{t("sitePanelShell.seoUi.sections.issues", { count: issues })}</span>
                    </div>
                  </div>
                  <div className="row-wrap" style={{ alignItems: "center" }}>
                    <span className={scoreCls}>{t("sitePanelShell.seoUi.sections.score", { score })}</span>
                    <button className="btn" type="button" onClick={() => setOpenSeo(true)}>{t("sitePanelShell.seoUi.actions.editMeta")}</button>
                  </div>
                </div>
              );
            })}
            {pages.length === 0 && <div className="text-muted">{t("common.noResults")}</div>}
          </div>
        </div>

        {openSeo && (
          <Modal
            isOpen={openSeo}
            onClose={() => {
              setOpenSeo(false);
              void loadData();
            }}
            title={t("sitePanelShell.seoUi.modals.settingsTitle")}
            size="lg"
          >
            <SeoForm />
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}

