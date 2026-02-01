"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState, Button, Input, Modal, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
} from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { FieldsEditor, type FieldDefinition } from '@/components/content/FieldsEditor';
import { fieldsToSimpleSchema, simpleSchemaToFields } from '@/lib/schema-converter';

type CollectionWithDetails = CollectionSummary & {
  schemaJson?: Record<string, unknown>;
};

export default function CollectionsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionWithDetails | null>(null);
  const [deletingCollectionSlug, setDeletingCollectionSlug] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createFields, setCreateFields] = useState<FieldDefinition[]>([]);
  const [createSaving, setCreateSaving] = useState(false);

  const [editName, setEditName] = useState('');
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
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
      }

      const id = site.siteId;
      setSiteId(id);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const collectionsData = await fetchSiteCollections(id);
      setCollections(collectionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? wczyta? kolekcji';
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

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

      toast.push({ tone: 'success', message: 'Kolekcja utworzona pomy?lnie' });

      setShowCreateModal(false);
      setCreateName('');
      setCreateSlug('');
      setCreateFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? utworzy? kolekcji';
      toast.push({ tone: 'error', message });
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

      toast.push({ tone: 'success', message: 'Kolekcja zaktualizowana' });

      setEditingCollection(null);
      setEditName('');
      setEditFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? zaktualizowa? kolekcji';
      toast.push({ tone: 'error', message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingCollectionSlug) return;

    try {
      await deleteCollection(siteId, deletingCollectionSlug);

      toast.push({ tone: 'success', message: 'Kolekcja usuni?ta' });

      setDeletingCollectionSlug(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie uda?o si? usun?? kolekcji';
      toast.push({ tone: 'error', message });
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
        tone: 'error',
        message: err instanceof Error ? err.message : 'Nie uda?o si? wczyta? kolekcji',
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Kolekcje"
          description="Modeluj dane i zarz?dzaj tre?ciami strukturalnymi (np. blog, aktualno?ci, wydarzenia)."
          action={{
            label: 'Nowa kolekcja',
            onClick: () => setShowCreateModal(true),
          }}
        />

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Wczytywanie kolekcji..." />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="Brak kolekcji"
                  description="Utw?rz pierwsz? kolekcj?, aby zacz?? zarz?dza? tre?ciami."
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
                      <rect x="4" y="5" width="16" height="4" rx="1.5" />
                      <rect x="4" y="11" width="8" height="8" rx="1.5" />
                      <rect x="14" y="11" width="6" height="8" rx="1.5" />
                    </svg>
                  }
                  action={{
                    label: 'Utw?rz kolekcj?',
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Pola</TableHead>
                      <TableHead>Utworzono</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => {
                      const schemaJson = ('schemaJson' in collection ? (collection as CollectionWithDetails).schemaJson : undefined) || {};
                      const fieldCount = Object.keys(schemaJson).length;

                      return (
                        <TableRow key={collection.id}>
                          <TableCell className="font-medium">
                            {collection.name}
                          </TableCell>
                          <TableCell className="text-muted font-mono text-sm">
                            {collection.slug}
                          </TableCell>
                          <TableCell>
                            <Badge>{fieldCount} {fieldCount === 1 ? 'pole' : 'p?l'}</Badge>
                          </TableCell>
                          <TableCell className="text-muted text-sm">
                            {formatDate(collection.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditModal(collection)}>
                                Edytuj
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/sites/${encodeURIComponent(slug)}/panel/collections/${collection.slug}`)}
                              >
                                Wpisy
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeletingCollectionSlug(collection.slug)}>
                                Usu?
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
              setCreateName('');
              setCreateSlug('');
              setCreateFields([]);
            }}
            title="Utw?rz kolekcj?"
            size="lg"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nazwa kolekcji"
                placeholder="np. Blog"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
              <Input
                label="Slug kolekcji"
                placeholder="np. blog"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                required
              />

              <div>
                <div className="text-sm font-medium mb-2">Pola</div>
                <FieldsEditor fields={createFields} onChange={setCreateFields} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateName('');
                    setCreateSlug('');
                    setCreateFields([]);
                  }}
                >
                  Anuluj
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? 'Tworzenie...' : 'Utw?rz kolekcj?'}
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
              setEditName('');
              setEditFields([]);
            }}
            title={`Edytuj kolekcj?: ${editingCollection.name}`}
            size="lg"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              <Input
                label="Nazwa kolekcji"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <div>
                <div className="text-sm font-medium mb-2">Pola</div>
                <FieldsEditor fields={editFields} onChange={setEditFields} />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCollection(null);
                    setEditName('');
                    setEditFields([]);
                  }}
                >
                  Anuluj
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
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
            title="Usu? kolekcj?"
            message={`Czy na pewno chcesz usun?? kolekcj? "${deletingCollectionSlug}"? Spowoduje to usuni?cie wszystkich wpis?w w tej kolekcji. Operacja jest nieodwracalna.`}
            confirmLabel="Usu?"
            cancelLabel="Anuluj"
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
