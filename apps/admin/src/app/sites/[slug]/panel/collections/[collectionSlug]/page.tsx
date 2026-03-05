"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { EmptyState, Button, Modal, LoadingSpinner } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  fetchMySites,
  exchangeSiteToken,
  getSiteToken,
  getCollection,
  fetchCollectionItems,
  createCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  type CollectionItem,
  type CollectionSummary,
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import DynamicForm from "@/components/content/DynamicForm";
import { simpleSchemaToFields } from "@/lib/schema-converter";
import type { FieldDefinition } from "@/components/content/FieldsEditor";

type CollectionDetails = CollectionSummary & { schemaJson?: Record<string, unknown> };

export default function CollectionItemsPage() {
  const params = useParams<{ slug: string; collectionSlug: string }>();
  const slug = params?.slug as string;
  const collectionSlug = params?.collectionSlug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<"DRAFT" | "PUBLISHED" | "all">("all");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [createData, setCreateData] = useState<Record<string, unknown>>({});
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [createSaving, setCreateSaving] = useState(false);

  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [editStatus, setEditStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!slug || !collectionSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = site.siteId;
      setSiteId(id);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const [collectionData, itemsData] = await Promise.all([
        getCollection(id, collectionSlug),
        fetchCollectionItems(id, collectionSlug, {
          page,
          pageSize,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
      ]);

      setCollection(collectionData);
      setItems(itemsData.items);
      setTotal(itemsData.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, collectionSlug, page, pageSize, statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;

    try {
      setCreateSaving(true);

      await createCollectionItem(siteId, collectionSlug, {
        data: createData,
        status: createStatus,
      });

      toast.push({ tone: "success", message: "Entry created" });

      setShowCreateModal(false);
      setCreateData({});
      setCreateStatus("DRAFT");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create entry";
      toast.push({ tone: "error", message });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !editingItem) return;

    try {
      setEditSaving(true);

      await updateCollectionItem(siteId, collectionSlug, editingItem.id, {
        data: editData,
        status: editStatus,
      });

      toast.push({ tone: "success", message: "Entry updated" });

      setEditingItem(null);
      setEditData({});
      setEditStatus("DRAFT");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update entry";
      toast.push({ tone: "error", message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingItemId) return;

    try {
      await deleteCollectionItem(siteId, collectionSlug, deletingItemId);

      toast.push({ tone: "success", message: "Entry deleted" });

      setDeletingItemId(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete entry";
      toast.push({ tone: "error", message });
    }
  };

  const openEditModal = async (item: CollectionItem) => {
    if (!siteId) return;

    try {
      const fullItem = await getCollectionItem(siteId, collectionSlug, item.id);
      setEditingItem(fullItem);
      setEditData(fullItem.data);
      setEditStatus(fullItem.status);
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to load entry",
      });
    }
  };

  const schemaFields: FieldDefinition[] = collection?.schemaJson
    ? simpleSchemaToFields(collection.schemaJson as Record<string, unknown>)
    : [];

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="collections"
      title={t("sitePanelShell.collectionItems.title", { collection: collection?.name || collectionSlug })}
      subtitle={t("sitePanelShell.collectionItems.subtitle")}
      actions={
        <button className="btn btn-primary" type="button" onClick={() => setShowCreateModal(true)} disabled={loading || !siteId}>{t("sitePanelShell.actions.newEntry")}</button>
      }
    >
      <div className="animate-fade-in">

        <div className="card card-pad">
          <div className="row-between flex-wrap gap-3">
            <div className="row flex-wrap gap-2.5">
              <span className="badge gray">Total: {total}</span>
              <span className="badge gray">{t("siteModules.siteLabel")}: {slug}</span>
              <span className="badge blue">Collection: {collectionSlug}</span>
            </div>
            <div className="row gap-2.5">
              <label className="detail-label">Status</label>
              <select
                className="input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "DRAFT" | "PUBLISHED" | "all")}
              >
                <option value="all">All</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
        </div>

        <div className="spacer" />

        <div className="card card-pad">
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="Loading entries..." />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No entries"
                description={`Create the first entry in "${collection?.name || collectionSlug}".`}
                action={{
                  label: "Create entry",
                  onClick: () => setShowCreateModal(true),
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.id.slice(0, 8)}
                        <div className="text-xs text-muted mt-1">
                          {Object.entries(item.data || {})
                            .slice(0, 2)
                            .map(([key, value]) => {
                              const val = typeof value === "string" ? value : JSON.stringify(value);
                              return `${key}: ${val.substring(0, 30)}${val.length > 30 ? "..." : ""}`;
                            })
                            .join(" - ")}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${item.status === "PUBLISHED" ? "green" : "gray"}`}>
                          {item.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="text-muted text-sm">
                        {new Date(item.updatedAt).toLocaleDateString("en-US")}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn" type="button" onClick={() => openEditModal(item)}>
                            Edit
                          </button>
                          <button className="btn" type="button" onClick={() => setDeletingItemId(item.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateData({});
              setCreateStatus("DRAFT");
            }}
            title={`New entry - ${collection?.name || collectionSlug}`}
            size="lg"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm fields={schemaFields} data={createData} onChange={setCreateData} />
              ) : (
                <div className="text-sm text-muted">No fields available for this collection.</div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Status</label>
                <select
                  className="input"
                  value={createStatus}
                  onChange={(event) => setCreateStatus(event.target.value as "DRAFT" | "PUBLISHED")}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? "Creating..." : "Create entry"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {editingItem && (
          <Modal
            isOpen={!!editingItem}
            onClose={() => {
              setEditingItem(null);
              setEditData({});
              setEditStatus("DRAFT");
            }}
            title={`Edit entry - ${collection?.name || collectionSlug}`}
            size="lg"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm fields={schemaFields} data={editData} onChange={setEditData} />
              ) : (
                <div className="text-sm text-muted">No fields available for this collection.</div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Status</label>
                <select
                  className="input"
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as "DRAFT" | "PUBLISHED")}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {deletingItemId && (
          <ConfirmDialog
            open={Boolean(deletingItemId)}
            onClose={() => setDeletingItemId(null)}
            onConfirm={handleDelete}
            title="Delete entry"
            message="Are you sure you want to delete this entry? This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
