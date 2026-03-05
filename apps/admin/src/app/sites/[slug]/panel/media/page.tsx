"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { createApiClient } from "@repo/sdk";
import type { SiteInfo, MediaItem } from "@repo/sdk";
import dynamic from "next/dynamic";
import { timeAgo, fmtBytes, clamp } from "@/lib/formatters";

const MediaManager = dynamic(
  () => import("@/components/media-manager/MediaManager").then((mod) => ({ default: mod.MediaManager })),
  { ssr: false }
);

export default function MediaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();
  const apiClient = useMemo(() => createApiClient(), []);

  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);

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
        throw new Error(t("sitePanelShell.mediaUi.toasts.siteNotFound", { slug }));
      }
      setSiteId(site.siteId);
      setSiteName(site.site?.name || slug);

      let token = getSiteToken(site.siteId);
      if (!token) {
        token = await exchangeSiteToken(site.siteId);
      }

      const items = await apiClient.listSiteMedia(token, site.siteId);
      setMedia(items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.mediaUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = media.length;
  const used = media.reduce((sum, m) => sum + (m.size || 0), 0);
  const limit = 120 * 1024 * 1024 * 1024;
  const pct = clamp(Math.round((used / limit) * 100), 0, 100);

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="media"
      title={t("sitePanelShell.media.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.media.subtitle")}
      actions={
        <>
          <button
            className="btn"
            type="button"
            onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.mediaUi.toasts.optimizeMock") })}
          >{t("sitePanelShell.actions.optimize")}</button>
          <button className="btn btn-primary" type="button" onClick={() => setShowUpload(true)}>{t("sitePanelShell.actions.upload")}</button>
        </>
      }
    >
      <div>

        <div className="grid cols-3">
          <div className="card stat-card">
            <div className="section-link">{t("sitePanelShell.mediaUi.cards.assets")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{total}</div>
            <div className="spacer-sm" />
            <span className="badge gray">{t("sitePanelShell.mediaUi.cards.searchable")}</span>
          </div>
          <div className="card stat-card">
            <div className="section-link">{t("sitePanelShell.mediaUi.cards.storage")}</div>
            <div className="spacer-sm" />
            <div className="project-name">{fmtBytes(used)} / {fmtBytes(limit)}</div>
            <div className="spacer-sm" />
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="card stat-card">
            <div className="section-link">{t("sitePanelShell.mediaUi.cards.cdn")}</div>
            <div className="spacer-sm" />
            <span className="badge green">{t("sitePanelShell.mediaUi.cards.active")}</span>
            <div className="spacer-sm" />
            <span className="badge gray">{t("sitePanelShell.mediaUi.cards.cache") }</span>
          </div>
        </div>

        <div className="spacer" />

        <div className="grid cols-3">
          {loading ? (
            <div className="card card-pad text-muted">{t("common.loading")}</div>
          ) : media.length === 0 ? (
            <div className="card card-pad text-muted">{t("common.noResults")}</div>
          ) : (
            media
              .slice()
              .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              .slice(0, 12)
              .map((f) => {
                const kind = (f.mimeType || "file").split("/")[0] || "file";
                const kindBadge =
                  kind === "image"
                    ? "badge green"
                    : kind === "application"
                      ? "badge blue"
                      : kind === "video"
                        ? "badge orange"
                        : "badge gray";

                return (
                  <div key={f.id} className="card tab-bar">
                    <div className="media-thumb">
                      {kind.toUpperCase()}
                    </div>
                    <div className="spacer-sm" />
                    <div className="truncate project-name">
                      {f.filename}
                    </div>
                    <div className="detail-label truncate mt-2">
                      /uploads - {fmtBytes(f.size)}
                    </div>
                    <div className="tag-row">
                      <span className={kindBadge}>{kind}</span>
                      <span className="badge gray">{timeAgo(f.updatedAt || f.createdAt)}</span>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {showUpload && siteId && (
          <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title={t("sitePanelShell.mediaUi.modals.uploadTitle")} size="lg">
            <MediaManager siteSlug={slug} />
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}

