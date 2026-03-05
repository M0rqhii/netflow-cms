"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites } from "@/lib/api";
import { timeAgo, clamp } from "@/lib/formatters";
import type { SiteInfo } from "@repo/sdk";
import { SeoForm } from "@/components/site-seo/SeoForm";

export default function SEOPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [openSeo, setOpenSeo] = useState(false);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.seoUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const checklist = [
    { label: "Meta title", ok: true },
    { label: "Meta description", ok: true },
    { label: "Canonical", ok: true },
    { label: "Sitemap.xml", ok: true },
    { label: "Robots.txt", ok: true },
    { label: "OpenGraph", ok: false },
    { label: "JSON-LD", ok: false },
    { label: "Performance budget", ok: true },
  ];

  const pages = [
    { title: "Home", slug: "/", indexable: true, score: 92, issues: 0, updatedAt: Date.now() - 1000 * 60 * 60 * 2 },
    { title: "O nas", slug: "/about", indexable: true, score: 84, issues: 1, updatedAt: Date.now() - 1000 * 60 * 60 * 8 },
    { title: "Blog", slug: "/blog", indexable: true, score: 76, issues: 2, updatedAt: Date.now() - 1000 * 60 * 60 * 18 },
    { title: "Kontakt", slug: "/contact", indexable: false, score: 68, issues: 4, updatedAt: Date.now() - 1000 * 60 * 60 * 30 },
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
          <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.seoUi.toasts.runAudit") })}>{t("sitePanelShell.actions.runAudit")}</button>
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
              <span className="badge gray">Mock</span>
            </div>
            <div className="spacer-sm" />
            {pages.map((p) => {
              const scoreCls = p.score >= 85 ? "badge green" : p.score >= 70 ? "badge blue" : "badge orange";
              return (
                <div key={p.slug} className="list-row">
                  <div className="min-w-0">
                    <div className="truncate project-name">{p.title}</div>
                    <div className="detail-label mt-2">
                      {p.slug} - {t("sitePanelShell.seoUi.sections.updated", { time: timeAgo(p.updatedAt) })}
                    </div>
                    <div className="tag-row">
                      <span className="badge gray">{t("sitePanelShell.seoUi.sections.index", { value: p.indexable ? t("sitePanelShell.seoUi.status.yes") : t("sitePanelShell.seoUi.status.no") })}</span>
                      <span className="badge gray">{t("sitePanelShell.seoUi.sections.issues", { count: p.issues })}</span>
                    </div>
                  </div>
                  <div className="row-wrap" style={{ alignItems: "center" }}>
                    <span className={scoreCls}>{t("sitePanelShell.seoUi.sections.score", { score: p.score })}</span>
                    <button className="btn" type="button" onClick={() => setOpenSeo(true)}>{t("sitePanelShell.seoUi.actions.editMeta")}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {openSeo && (
          <Modal isOpen={openSeo} onClose={() => setOpenSeo(false)} title={t("sitePanelShell.seoUi.modals.settingsTitle")} size="lg">
            <SeoForm />
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}

