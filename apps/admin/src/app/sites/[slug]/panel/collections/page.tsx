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
import { fetchMySites, exchangeSiteToken, getSiteToken, fetchSiteCollections, createCollection, updateCollection, deleteCollection, getCollection, type CollectionSummary } from '@/lib/api';
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

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createFields, setCreateFields] = useState<FieldDefinition[]>([]);
  const [createSaving, setCreateSaving] = useState(false);

  // Edit form state
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

      const collectionsData = await fetchSiteCollections(id);
      setCollections(collectionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load collections';
      toast.push({
        tone: 'error',
        message,
      });
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

      toast.push({
        tone: 'success',
        message: 'Collection created successfully',
      });

      setShowCreateModal(false);
      setCreateName('');
      setCreateSlug('');
      setCreateFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create collection';
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
    if (!siteId || !editingCollection || !editName) return;

    try {
      setEditSaving(true);

      const schemaJson = editFields.length > 0 ? fieldsToSimpleSchema(editFields) : {};

      await updateCollection(siteId, editingCollection.slug, {
        name: editName,
        schemaJson,
      });

      toast.push({
        tone: 'success',
        message: 'Collection updated successfully',
      });

      setEditingCollection(null);
      setEditName('');
      setEditFields([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update collection';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!siteId || !deletingCollectionSlug) return;

    try {
      await deleteCollection(siteId, deletingCollectionSlug);

      toast.push({
        tone: 'success',
        message: 'Collection deleted successfully',
      });

      setDeletingCollectionSlug(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete collection';
      toast.push({
        tone: 'error',
        message,
      });
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
        message: err instanceof Error ? err.message : 'Failed to load collection',
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Collections"
          description="Collections allow you to model structured data (e.g., blog posts, news, events)."
          action={{
            label: 'New collection',
            onClick: () => setShowCreateModal(true),
          }}
        />

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Loading collections..." />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No collections yet"
                  description="Create your first collection to start managing structured content."
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
                      <rect x="4" y="5" width="16" height="4" rx="1.5" />
                      <rect x="4" y="11" width="8" height="8" rx="1.5" />
                      <rect x="14" y="11" width="6" height="8" rx="1.5" />
                    </svg>
                  }
                  action={{
                    label: "Create collection",
                    onClick: () => setShowCreateModal(true),
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => {
                      const schemaJson = (collection as any).schemaJson || {};
                      const fieldCount = Object.keys(schemaJson).length;
                      
                      return (
                        <TableRow key={collection.id}>
                          <TableCell className="font-medium">{collection.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{collection.slug}</code>
                          </TableCell>
                          <TableCell>
                            <Badge>{fieldCount} {fieldCount === 1 ? 'field' : 'fields'}</Badge>
                          </TableCell>
                          <TableCell className="text-muted">{formatDate(collection.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/sites/${slug}/panel/collections/${collection.slug}`)}
                              >
                                View Items
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(collection)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingCollectionSlug(collection.slug)}
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
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <Modal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setCreateName('');
              setCreateSlug('');
              setCreateFields([]);
            }}
            title="Create Collection"
            size="xl"
          >
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g., Articles, Products"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
              <Input
                label="Slug"
                placeholder="e.g., articles, products"
                value={createSlug}
                onChange={(e) => {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                  setCreateSlug(slug);
                }}
                required
                pattern="[a-z0-9-]+"
                helperText="URL-friendly identifier (lowercase, hyphens only)"
              />
              
              <div>
                <label className="block text-sm font-medium mb-2">Schema Fields</label>
                <p className="text-sm text-muted mb-3">
                  Define the structure of your collection. You can add fields later.
                </p>
                <FieldsEditor
                  fields={createFields}
                  onChange={setCreateFields}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
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
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? 'Creating...' : 'Create Collection'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Modal */}
        {editingCollection && (
          <Modal
            isOpen={!!editingCollection}
            onClose={() => {
              setEditingCollection(null);
              setEditName('');
              setEditFields([]);
            }}
            title="Edit Collection"
            size="xl"
          >
            <form onSubmit={handleEdit} className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g., Articles, Products"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <code className="text-sm bg-gray-100 px-3 py-2 rounded block">{editingCollection.slug}</code>
                <p className="text-xs text-muted mt-1">Slug cannot be changed after creation</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Schema Fields</label>
                <FieldsEditor
                  fields={editFields}
                  onChange={setEditFields}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCollection(null);
                    setEditName('');
                    setEditFields([]);
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
        {deletingCollectionSlug && (
          <ConfirmDialog
            open={!!deletingCollectionSlug}
            onClose={() => setDeletingCollectionSlug(null)}
            onConfirm={handleDelete}
            title="Delete Collection"
            message={`Are you sure you want to delete the collection "${deletingCollectionSlug}"? This will also delete all items in this collection. This action cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
          />
        )}
      </div>
    </SitePanelLayout>
  );
}
