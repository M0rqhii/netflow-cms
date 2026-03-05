"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Modal, Button } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  fetchMySites,
  exchangeSiteToken,
  getSiteToken,
  fetchSiteCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollection,
  type CollectionSummary,
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { FieldsEditor, type FieldDefinition } from "@/components/content/FieldsEditor";
import { fieldsToSimpleSchema, simpleSchemaToFields } from "@/lib/schema-converter";

type CollectionWithDetails = CollectionSummary & {
  schemaJson?: Record<string, unknown>;
};

export default function CollectionsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionWithDetails | null>(null);
  const [deletingCollectionSlug, setDeletingCollectionSlug] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createFields, setCreateFields] = useState<FieldDefinition[]>([]);
  const [createSaving, setCreateSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editFields, setEditFields] = useState<FieldDefinition[]>([]);
  const [editSaving, setEditSaving] = useState(false);

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
        throw new Error(t("sitePanelShell.collectionsUi.toasts.siteNotFound", { slug }));
      }

      const id = site.siteId;
      setSiteId(id);
      setSiteName(site.site?.name || slug);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const collectionsData = await fetchSiteCollections(id);
      setCollections(collectionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.collectionsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !createName || !createSlug) return;

    try {
      setCreateSaving(true);

      const schemaJson = createFields.length > 0 ? fieldsToSimpleSchema(createFields) : {};

      await createCollection(siteId, {
        name: createName,
        slug: createSlug,
        schemaJson,
      });

      toast.push({ tone: "success", message: t("sitePanelShell.collectionsUi.toasts.createSuccess") });

      setShowCreateModal(false);
      setCreateName("");
      setCreateSlug("");
      setCreateFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.collectionsUi.toasts.createError");
      toast.push({ tone: "error", message });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !editingCollection || !editName) return;

    try {
      setEditSaving(true);

      const schemaJson = editFields.length > 0 ? fieldsToSimpleSchema(editFields) : {};

      await updateCollection(siteId, editingCollection.slug, {
        name: editName,
        schemaJson,
      });

      toast.push({ tone: "success", message: t("sitePanelShell.collectionsUi.toasts.updateSuccess") });

      setEditingCollection(null);
      setEditName("");
      setEditFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.collectionsUi.toasts.updateError");
      toast.push({ tone: "error", message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingCollectionSlug) return;

    try {
      await deleteCollection(siteId, deletingCollectionSlug);

      toast.push({ tone: "success", message: t("sitePanelShell.collectionsUi.toasts.deleteSuccess") });

      setDeletingCollectionSlug(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.collectionsUi.toasts.deleteError");
      toast.push({ tone: "error", message });
    }
  };

  const openEditModal = async (collection: CollectionSummary) => {
    if (!siteId) return;

    try {
      const fullCollection = await getCollection(siteId, collection.slug);
      const schemaJson = fullCollection.schemaJson || {};
      const fields = simpleSchemaToFields(schemaJson as Record<string, unknown>);

      setEditingCollection(fullCollection);
      setEditName(fullCollection.name);
      setEditFields(fields);
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : t("sitePanelShell.collectionsUi.toasts.loadError"),
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="collections"
      title={t("sitePanelShell.collections.title", { site: siteName || slug })}
      subtitle={t("sitePanelShell.collections.subtitle")}
      actions={
        <button className="btn primary" type="button" onClick={() => setShowCreateModal(true)}>{t("sitePanelShell.actions.newCollection")}</button>
      }
    >
      <div>

        <div className="grid cols-2">
          {loading ? (
            <div className="card card-pad text-muted">{t("common.loading")}</div>
          ) : collections.length === 0 ? (
            <div className="card card-pad text-muted">{t("sitePanelShell.collectionsUi.states.noCollections")}</div>
          ) : (
            collections.map((collection) => {
              const schemaJson = ("schemaJson" in collection ? (collection as CollectionWithDetails).schemaJson : undefined) || {};
              const fieldCount = Object.keys(schemaJson).length;
              return (
                <div key={collection.id} className="card tab-bar">
                  <div className="row-between">
                    <div className="min-w-0">
                      <div className="project-name">{collection.name}</div>
                      <div className="detail-label mt-1">
                        {collection.slug} - {formatDate(collection.createdAt)}
                      </div>
                      <div className="tag-row">
                        <span className="badge gray">{t("sitePanelShell.collectionsUi.labels.fields", { count: fieldCount })}</span>
                      </div>
                    </div>
                    <div className="row-wrap">
                      <button className="btn" type="button" onClick={() => openEditModal(collection)}>{t("common.edit")}</button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections/${collection.slug}`)}
                      >
                        {t("sitePanelShell.collectionsUi.actions.entries")}
                      </button>
                      <button className="btn" type="button" onClick={() => setDeletingCollectionSlug(collection.slug)}>
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateName("");
              setCreateSlug("");
              setCreateFields([]);
            }}
            title={t("sitePanelShell.collectionsUi.modals.createTitle")}
            size="lg"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.collectionsUi.fields.name")}</label>
                <input
                  className="input"
                  placeholder={t("sitePanelShell.collectionsUi.fields.namePlaceholder")}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.collectionsUi.fields.slug")}</label>
                <input
                  className="input"
                  placeholder={t("sitePanelShell.collectionsUi.fields.slugPlaceholder")}
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-2">{t("sitePanelShell.collectionsUi.fields.fields")}</div>
                <FieldsEditor fields={createFields} onChange={setCreateFields} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateName("");
                    setCreateSlug("");
                    setCreateFields([]);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? t("sitePanelShell.collectionsUi.actions.creating") : t("sitePanelShell.collectionsUi.actions.createCollection")}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {editingCollection && (
          <Modal
            isOpen={!!editingCollection}
            onClose={() => {
              setEditingCollection(null);
              setEditName("");
              setEditFields([]);
            }}
            title={t("sitePanelShell.collectionsUi.modals.editTitle", { name: editingCollection.name })}
            size="lg"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("sitePanelShell.collectionsUi.fields.name")}</label>
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="text-sm font-medium mb-2">{t("sitePanelShell.collectionsUi.fields.fields")}</div>
                <FieldsEditor fields={editFields} onChange={setEditFields} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCollection(null);
                    setEditName("");
                    setEditFields([]);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? t("sitePanelShell.collectionsUi.actions.saving") : t("sitePanelShell.collectionsUi.actions.saveChanges")}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {deletingCollectionSlug && (
          <ConfirmDialog
            open={Boolean(deletingCollectionSlug)}
            onClose={() => setDeletingCollectionSlug(null)}
            onConfirm={handleDelete}
            title={t("sitePanelShell.collectionsUi.modals.deleteTitle")}
            message={t("sitePanelShell.collectionsUi.modals.deleteMessage", { slug: deletingCollectionSlug })}
            confirmLabel={t("common.delete")}
            cancelLabel={t("common.cancel")}
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
