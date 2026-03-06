"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal, Button } from "@repo/ui";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, exchangeSiteToken, getSiteToken } from "@/lib/api";
import { timeAgo } from "@/lib/formatters";
import { trackOnboardingSuccess } from "@/lib/onboarding";
import { withTimeout } from "@/lib/withTimeout";
import { createApiClient } from "@repo/sdk";
import type { SiteInfo, SitePage, SiteEnvironment } from "@repo/sdk";

type PageWithEnvironment = SitePage & {
  environment?: SiteEnvironment;
};

const REQUEST_TIMEOUT_MS = 15000;

export default function PagesPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageWithEnvironment[]>([]);
  const [environments, setEnvironments] = useState<SiteEnvironment[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState<PageWithEnvironment | null>(null);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createEnvironmentId, setCreateEnvironmentId] = useState<string>("");

  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const apiClient = useMemo(() => createApiClient(), []);

  useEffect(() => {
    trackOnboardingSuccess("editor_opened");
  }, []);

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await withTimeout(
        fetchMySites(),
        REQUEST_TIMEOUT_MS,
        t("sitePanelShell.pagesUi.toasts.loadTimeout")
      );
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(t("sitePanelShell.pagesUi.toasts.siteNotFound", { slug }));
      }

      const id = site.siteId;
      setSiteId(id);
      setSiteInfo(site);

      let token = getSiteToken(id);
      if (!token) {
        token = await withTimeout(
          exchangeSiteToken(id),
          REQUEST_TIMEOUT_MS,
          t("sitePanelShell.pagesUi.toasts.loadTimeout")
        );
      }

      const [pagesData, environmentsData] = await withTimeout(
        Promise.all([
          apiClient.listPages(token, id, { environmentType: "draft" }),
          apiClient.listSiteEnvironments(token, id),
        ]),
        REQUEST_TIMEOUT_MS,
        t("sitePanelShell.pagesUi.toasts.loadTimeout")
      );

      const pagesWithEnv: PageWithEnvironment[] = pagesData.map((page) => ({
        ...page,
        environment: environmentsData.find((env) => env.id === page.environmentId),
      }));

      setPages(pagesWithEnv);
      setEnvironments(environmentsData);

      if (environmentsData.length > 0 && !createEnvironmentId) {
        const draftEnv = environmentsData.find((e) => e.type === "draft");
        if (draftEnv) {
          setCreateEnvironmentId(draftEnv.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.pagesUi.toasts.loadError");
      toast.push({
        tone: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, t, toast, createEnvironmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !createEnvironmentId) return;

    if (!createTitle || createTitle.trim().length === 0) {
      toast.push({
        tone: "error",
        message: t("sitePanelShell.pagesUi.toasts.titleRequired"),
      });
      return;
    }

    const finalSlug = createSlug || createTitle.toLowerCase().replace(/\s+/g, "-");
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(finalSlug)) {
      toast.push({
        tone: "error",
        message: t("sitePanelShell.pagesUi.toasts.slugInvalid"),
      });
      return;
    }

    try {
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      const newPage = await apiClient.createPage(token, siteId, {
        environmentId: createEnvironmentId,
        slug: finalSlug,
        title: createTitle,
        status: "draft",
        content: {},
      });

      toast.push({
        tone: "success",
        message: t("sitePanelShell.pagesUi.toasts.createSuccess"),
      });

      setShowCreateModal(false);
      setCreateTitle("");
      setCreateSlug("");

      if (newPage && newPage.id) {
        router.push(`/sites/${slug}/panel/page-builder?pageId=${newPage.id}`);
      } else {
        await loadData();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.pagesUi.toasts.createError");
      toast.push({
        tone: "error",
        message,
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !editingPage) return;

    try {
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.updatePage(token, siteId, editingPage.id, {
        title: editTitle,
        slug: editSlug,
      });

      toast.push({
        tone: "success",
        message: t("sitePanelShell.pagesUi.toasts.updateSuccess"),
      });

      setEditingPage(null);
      setEditTitle("");
      setEditSlug("");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.pagesUi.toasts.updateError");
      toast.push({
        tone: "error",
        message,
      });
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!siteId) return;

    try {
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.deletePage(token, siteId, pageId);

      toast.push({
        tone: "success",
        message: t("sitePanelShell.pagesUi.toasts.deleteSuccess"),
      });

      setDeletingPageId(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.pagesUi.toasts.deleteError");
      toast.push({
        tone: "error",
        message,
      });
      setDeletingPageId(null);
    }
  };

  const openEditModal = (page: PageWithEnvironment) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
  };

  const siteName = siteInfo?.site?.name || slug || t("sitePanelShell.pagesUi.labels.site");

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="pages"
      title={t("sitePanelShell.pages.title", { site: siteName })}
      subtitle={t("sitePanelShell.pages.subtitle")}
      actions={
        <button className="btn btn-primary" type="button" onClick={() => setShowCreateModal(true)}>{t("sitePanelShell.actions.addPage")}</button>
      }
    >
      <div>

        <div className="grid cols-2">
          {loading ? (
            <div className="card card-pad text-muted">{t("common.loading")}</div>
          ) : pages.length === 0 ? (
            <div className="card card-pad text-muted">{t("sitePanelShell.pagesUi.states.noPages")}</div>
          ) : (
            pages
              .slice()
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((page) => (
                <div key={page.id} className="card tab-bar">
                  <div className="row-between">
                    <div className="min-w-0">
                      <div className="project-name">{page.title}</div>
                      <div className="detail-label mt-1">
                        {page.slug} - {timeAgo(page.updatedAt)}
                      </div>
                    </div>
                    <div className="row-wrap">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`)}
                      >{t("sitePanelShell.pagesUi.actions.builder")}</button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => openEditModal(page)}
                      >{t("common.edit")}</button>
                      <Tooltip content={t("sitePanelShell.pagesUi.tooltips.preview")}> 
                        <button className="btn" type="button">{t("sitePanelShell.pagesUi.actions.preview")}</button>
                      </Tooltip>
                      <Tooltip content={t("common.delete")}> 
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setDeletingPageId(page.id)}
                        >{t("common.delete")}</button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateTitle("");
              setCreateSlug("");
            }}
            title={t("sitePanelShell.pagesUi.modals.createTitle")}
            size="sm"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.pagesUi.fields.title")}</label>
                <input
                  className="input"
                  placeholder={t("sitePanelShell.pagesUi.fields.titlePlaceholder")}
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.pagesUi.fields.slug")}</label>
                <input
                  className="input"
                  placeholder={t("sitePanelShell.pagesUi.fields.slugPlaceholder")}
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.pagesUi.fields.environment")}</label>
                <select
                  className="input"
                  value={createEnvironmentId}
                  onChange={(e) => setCreateEnvironmentId(e.target.value)}
                  required
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.type === "production" ? t("sitePanelShell.pagesUi.fields.production") : t("sitePanelShell.pagesUi.fields.draft")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateTitle("");
                    setCreateSlug("");
                  }}
                >{t("common.cancel")}</Button>
                <Button type="submit" variant="primary">{t("common.create")}</Button>
              </div>
            </form>
          </Modal>
        )}

        {editingPage && (
          <Modal
            isOpen={!!editingPage}
            onClose={() => {
              setEditingPage(null);
              setEditTitle("");
              setEditSlug("");
            }}
            title={t("sitePanelShell.pagesUi.modals.editTitle")}
            size="sm"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.pagesUi.fields.title")}</label>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.pagesUi.fields.slug")}</label>
                <input
                  className="input"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingPage(null);
                    setEditTitle("");
                    setEditSlug("");
                  }}
                >{t("common.cancel")}</Button>
                <Button type="submit" variant="primary">{t("common.save")}</Button>
              </div>
            </form>
          </Modal>
        )}

        {deletingPageId && (
          <Modal
            isOpen={!!deletingPageId}
            onClose={() => setDeletingPageId(null)}
            title={t("sitePanelShell.pagesUi.modals.deleteTitle")}
            size="sm"
          >
            <div className="space-y-3">
              <div>{t("sitePanelShell.pagesUi.modals.deleteMessage")}</div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDeletingPageId(null)}>{t("common.cancel")}</Button>
                <Button variant="danger" onClick={() => handleDelete(deletingPageId)}>{t("common.delete")}</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </SitePanelLayout>
  );
}

