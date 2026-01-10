"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState, Button, Input, Modal, LoadingSpinner, Select } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { fetchMySites, exchangeSiteToken, getSiteToken, getCollection, fetchCollectionItems, createCollectionItem, updateCollectionItem, deleteCollectionItem, getCollectionItem, type CollectionItem } from '@/lib/api';
import DynamicForm from '@/components/content/DynamicForm';
import { simpleSchemaToFields } from '@/lib/schema-converter';
import type { FieldDefinition } from '@/components/content/FieldsEditor';

export default function CollectionItemsPage() {
  const params = useParams<{ slug: string; collectionSlug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const collectionSlug = params?.collectionSlug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<any>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PUBLISHED' | 'all'>('all');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Create form state
  const [createData, setCreateData] = useState<Record<string, unknown>>({});
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [createSaving, setCreateSaving] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [editStatus, setEditStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [editSaving, setEditSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!slug || !collectionSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const site = sites.find((s: any) => s.site.slug === slug);

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
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
      ]);

      setCollection(collectionData);
      setItems(itemsData.items);
      setTotal(itemsData.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      toast.push({
        tone: 'error',
        message,
      });
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

      toast.push({
        tone: 'success',
        message: 'Item created successfully',
      });

      setShowCreateModal(false);
      setCreateData({});
      setCreateStatus('DRAFT');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      toast.push({
        tone: 'error',
        message,
      });
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

      toast.push({
        tone: 'success',
        message: 'Item updated successfully',
      });

      setEditingItem(null);
      setEditData({});
      setEditStatus('DRAFT');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingItemId) return;

    try {
      await deleteCollectionItem(siteId, collectionSlug, deletingItemId);

      toast.push({
        tone: 'success',
        message: 'Item deleted successfully',
      });

      setDeletingItemId(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      toast.push({
        tone: 'error',
        message,
      });
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
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to load item',
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const schemaFields: FieldDefinition[] = collection?.schemaJson
    ? simpleSchemaToFields(collection.schemaJson as Record<string, unknown>)
    : [];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title={collection?.name || 'Collection Items'}
          description={`Manage items in the "${collectionSlug}" collection`}
          action={{
            label: 'New item',
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'DRAFT' | 'PUBLISHED' | 'all');
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'PUBLISHED', label: 'Published' },
                  ]}
                />
              </div>
              <div className="text-sm text-muted pt-6">
                {total} {total === 1 ? 'item' : 'items'} total
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Loading items..." />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No items yet"
                  description={`Create your first item in the "${collection?.name || collectionSlug}" collection.`}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
                      <rect x="5" y="4" width="12" height="15" rx="2" />
                      <path d="M7 8h6M7 11h4" strokeLinecap="round" />
                    </svg>
                  }
                  action={{
                    label: "Create item",
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data Preview</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const dataPreview = Object.entries(item.data)
                          .slice(0, 2)
                          .map(([key, value]) => {
                            const val = typeof value === 'string' ? value : JSON.stringify(value);
                            return `${key}: ${val.substring(0, 30)}${val.length > 30 ? '...' : ''}`;
                          })
                          .join(', ');

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {item.id.substring(0, 8)}...
                              </code>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="text-sm truncate">{dataPreview || 'No data'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge tone={item.status === 'PUBLISHED' ? 'success' : 'default'}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted">{item.version}</TableCell>
                            <TableCell className="text-muted">{formatDate(item.updatedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(item)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingItemId(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="text-sm text-muted">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateData({});
              setCreateStatus('DRAFT');
            }}
            title={`Create Item in "${collection?.name || collectionSlug}"`}
            size="xl"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm
                  fields={schemaFields}
                  data={createData}
                  onChange={setCreateData}
                  siteId={siteId || undefined}
                />
              ) : (
                <div className="text-sm text-muted py-4">
                  No fields defined in collection schema. Add fields in collection settings first.
                </div>
              )}

              <Select
                label="Status"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Published' },
                ]}
              />

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateData({});
                    setCreateStatus('DRAFT');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving || schemaFields.length === 0}>
                  {createSaving ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <Modal
            isOpen={!!editingItem}
            onClose={() => {
              setEditingItem(null);
              setEditData({});
              setEditStatus('DRAFT');
            }}
            title={`Edit Item in "${collection?.name || collectionSlug}"`}
            size="xl"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm
                  fields={schemaFields}
                  data={editData}
                  onChange={setEditData}
                  siteId={siteId || undefined}
                />
              ) : (
                <div className="text-sm text-muted py-4">
                  No fields defined in collection schema.
                </div>
              )}

              <Select
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Published' },
                ]}
              />

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingItem(null);
                    setEditData({});
                    setEditStatus('DRAFT');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete Confirmation */}
        {deletingItemId && (
          <ConfirmDialog
            open={!!deletingItemId}
            onClose={() => setDeletingItemId(null)}
            onConfirm={handleDelete}
            title="Delete Item"
            message="Are you sure you want to delete this item? This action cannot be undone."
            confirmLabel="Delete"
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
