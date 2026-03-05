"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal, Button } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, fetchSiteCollections, fetchContentEntries } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import type { CollectionSummary } from "@/lib/api";
import { timeAgo } from "@/lib/formatters";

export default function ContentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        throw new Error(t("sitePanelShell.contentUi.toasts.siteNotFound", { slug }));
      }

      const collectionsData = await fetchSiteCollections(site.siteId);
      setCollections(collectionsData);

      if (collectionsData.length > 0) {
        const totals = await Promise.all(
          collectionsData.map(async (collection) => {
            try {
              const result = await fetchContentEntries(site.siteId, collection.slug, { page: 1, pageSize: 1 });
              return [collection.slug, result.total] as const;
            } catch {
              return [collection.slug, 0] as const;
            }
          })
        );
        setCounts(Object.fromEntries(totals));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.contentUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalEntries = useMemo(() => {
    return Object.values(counts).reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
  }, [counts]);

  const drafts = Math.max(0, Math.round(totalEntries * 0.25));
  const scheduled = Math.max(0, Math.round(totalEntries * 0.15));

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="collections"
      title={t("sitePanelShell.content.title", { site: slug })}
      subtitle={t("sitePanelShell.content.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => setShowImportModal(true)}>{t("sitePanelShell.actions.import")}</button>
          <button className="btn primary" type="button" onClick={() => setShowCreateModal(true)}>{t("sitePanelShell.actions.newEntry")}</button>
        </>
      }
    >
      <div>

        <div className="grid cols-3">
          <div className="card tight card-pad">
            <div className="detail-label">{t("sitePanelShell.contentUi.cards.entries")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{totalEntries}</div>
            <div className="spacer-sm" />
            <span className="badge gray">{t("sitePanelShell.contentUi.cards.collections", { count: collections.length })}</span>
          </div>
          <div className="card tight card-pad">
            <div className="detail-label">{t("sitePanelShell.contentUi.cards.drafts")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{drafts}</div>
            <div className="spacer-sm" />
            <span className="badge blue">{t("sitePanelShell.contentUi.cards.scheduled", { count: scheduled })}</span>
          </div>
          <div className="card tight card-pad">
            <div className="detail-label">{t("sitePanelShell.contentUi.cards.authors")}</div>
            <div className="spacer-sm" />
            <div className="stat-value">{Math.max(3, Math.min(5, collections.length + 1))}</div>
            <div className="spacer-sm" />
            <span className="badge green">{t("sitePanelShell.contentUi.cards.workflowOk")}</span>
          </div>
        </div>

        <div className="spacer" />

        <div className="card card-pad">
          <div className="section-header">
            <div className="section-title">{t("sitePanelShell.contentUi.sections.collections")}</div>
            <span className="badge gray">Mock</span>
          </div>
          <div className="spacer-sm" />
          <div className="row-wrap" style={{ justifyContent: "flex-start" }}>
            {collections.length === 0 ? (
              <span className="badge gray">{t("sitePanelShell.contentUi.states.noCollections")}</span>
            ) : (
              collections.map((c) => (
                <span key={c.id} className="badge gray">{c.name}</span>
              ))
            )}
          </div>
        </div>

        <div className="spacer" />

        <div className="card card-pad">
          <div className="section-header">
            <div className="section-title">{t("sitePanelShell.contentUi.sections.entries")}</div>
            <span className="section-link">{t("sitePanelShell.contentUi.sections.recentChanges")}</span>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="text-muted">{t("common.loading")}</div>
          ) : collections.length === 0 ? (
            <div className="text-muted">{t("sitePanelShell.contentUi.states.noEntries")}</div>
          ) : (
            <div>
              {(collections || []).slice(0, 6).map((c, idx) => (
                <div key={c.id} className="list-row">
                  <div className="min-w-0">
                    <div className="truncate project-name">
                      {c.name}
                    </div>
                    <div className="detail-label mt-2">
                      {c.slug} - {timeAgo(Date.now() - idx * 1000 * 60 * 60 * 6)}
                    </div>
                    <div className="tag-row">
                      <span className="badge gray">#SEO</span>
                      <span className="badge gray">#CMS</span>
                      <span className="badge blue">SEO: {68 + idx * 3}</span>
                    </div>
                  </div>
                  <div className="row-wrap">
                    <button className="btn" type="button">{t("common.edit")}</button>
                    <button className="btn" type="button">{t("sitePanelShell.contentUi.actions.preview")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showImportModal && (
          <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title={t("sitePanelShell.contentUi.modals.importTitle")} size="sm">
            <div className="space-y-3">
              <div>{t("sitePanelShell.contentUi.modals.importMock")}</div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowImportModal(false)}>{t("common.close")}</Button>
              </div>
            </div>
          </Modal>
        )}

        {showCreateModal && (
          <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t("sitePanelShell.contentUi.modals.newEntryTitle")} size="sm">
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.contentUi.fields.title")}</label>
                <input className="input" placeholder={t("sitePanelShell.contentUi.fields.titlePlaceholder")} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>{t("common.cancel")}</Button>
                <Button variant="primary" type="button" onClick={() => setShowCreateModal(false)}>{t("common.create")}</Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}
