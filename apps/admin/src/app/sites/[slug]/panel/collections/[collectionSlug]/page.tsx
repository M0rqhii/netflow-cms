"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState, Button, Modal, LoadingSpinner, Select } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
} from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import DynamicForm from '@/components/content/DynamicForm';
import { simpleSchemaToFields } from '@/lib/schema-converter';
import type { FieldDefinition } from '@/components/content/FieldsEditor';

type CollectionDetails = CollectionSummary & { schemaJson?: Record<string, unknown> };

export default function CollectionItemsPage() {
  const params = useParams<{ slug: string; collectionSlug: string }>();
  const slug = params?.slug as string;
  const collectionSlug = params?.collectionSlug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PUBLISHED' | 'all'>('all');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [createData, setCreateData] = useState<Record<string, unknown>>({});
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [createSaving, setCreateSaving] = useState(false);

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
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
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
      const message = err instanceof Error ? err.message : 'Nie uda?o si? wczyta? danych';
      toast.push({ tone: 'error', message });
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

      toast.push({ tone: 'success', message: 'Wpis utworzony' });

      setShowCreateModal(false);
      setCreateData({});
      setCreateStatus('DRAFT');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? utworzy? wpisu';
      toast.push({ tone: 'error', message });
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

      toast.push({ tone: 'success', message: 'Wpis zaktualizowany' });

      setEditingItem(null);
      setEditData({});
      setEditStatus('DRAFT');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? zaktualizowa? wpisu';
      toast.push({ tone: 'error', message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingItemId) return;

    try {
      await deleteCollectionItem(siteId, collectionSlug, deletingItemId);

      toast.push({ tone: 'success', message: 'Wpis usuni?ty' });

      setDeletingItemId(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? usun?? wpisu';
      toast.push({ tone: 'error', message });
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
        message: err instanceof Error ? err.message : 'Nie uda?o si? wczyta? wpisu',
      });
    }
  };

  const schemaFields: FieldDefinition[] = collection?.schemaJson
    ? simpleSchemaToFields(collection.schemaJson as Record<string, unknown>)
    : [];

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title={collection?.name || 'Wpisy'}
          description={`Kolekcja: ${collectionSlug}`}
          action={{
            label: 'Nowy wpis',
            onClick: () => setShowCreateModal(true),
            disabled: loading || !siteId,
          }}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>??cznie: {total}</span>
                <span className="text-gray-300">?</span>
                <span>Strona: {slug}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Status</label>
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'DRAFT' | 'PUBLISHED' | 'all')}
                  options={[
                    { value: 'all', label: 'Wszystkie' },
                    { value: 'DRAFT', label: 'Szkic' },
                    { value: 'PUBLISHED', label: 'Opublikowane' },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Wczytywanie wpis?w..." />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Brak wpis?w"
                  description={`Utw?rz pierwszy wpis w kolekcji "${collection?.name || collectionSlug}".`}
                  action={{
                    label: 'Utw?rz wpis',
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wpis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Zaktualizowano</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.id.slice(0, 8)}
                          <div className="text-xs text-muted mt-1">
                            {Object.entries(item.data || {})
                              .slice(0, 2)
                              .map(([key, value]) => {
                                const val = typeof value === 'string' ? value : JSON.stringify(value);
                                return `${key}: ${val.substring(0, 30)}${val.length > 30 ? '...' : ''}`;
                              })
                              .join(' ? ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={item.status === 'PUBLISHED' ? 'success' : 'default'}>
                            {item.status === 'PUBLISHED' ? 'Opublikowane' : 'Szkic'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted text-sm">
                          {new Date(item.updatedAt).toLocaleDateString('pl-PL')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>
                              Edytuj
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeletingItemId(item.id)}>
                              Usu?
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateData({});
              setCreateStatus('DRAFT');
            }}
            title={`Nowy wpis ? ${collection?.name || collectionSlug}`}
            size="lg"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm
                  fields={schemaFields}
                  data={createData}
                  onChange={setCreateData}
                />
              ) : (
                <div className="text-sm text-muted">
                  Brak p?l w schemacie kolekcji.
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Status</label>
                <Select
                  value={createStatus}
                  onChange={(event) => setCreateStatus(event.target.value as 'DRAFT' | 'PUBLISHED')}
                  options={[
                    { value: 'DRAFT', label: 'Szkic' },
                    { value: 'PUBLISHED', label: 'Opublikowane' },
                  ]}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Anuluj
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? 'Tworzenie...' : 'Utw?rz wpis'}
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
              setEditStatus('DRAFT');
            }}
            title={`Edytuj wpis ? ${collection?.name || collectionSlug}`}
            size="lg"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              {schemaFields.length > 0 ? (
                <DynamicForm
                  fields={schemaFields}
                  data={editData}
                  onChange={setEditData}
                />
              ) : (
                <div className="text-sm text-muted">
                  Brak p?l w schemacie kolekcji.
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Status</label>
                <Select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as 'DRAFT' | 'PUBLISHED')}
                  options={[
                    { value: 'DRAFT', label: 'Szkic' },
                    { value: 'PUBLISHED', label: 'Opublikowane' },
                  ]}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Anuluj
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
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
            title="Usu? wpis"
            message="Czy na pewno chcesz usun?? ten wpis? Operacja jest nieodwracalna."
            confirmLabel="Usu?"
            cancelLabel="Anuluj"
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
