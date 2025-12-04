"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import { fetchTenantCollections, createCollection, deleteCollection, updateCollection, type CollectionSummary } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { canEditContent } from '@/lib/rbac';
import { Modal, Button, Input, Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingSpinner, EmptyState, Skeleton } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { slugify, isValidSlug } from '@/lib/slug';

export default function TenantCollectionsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cslug, setCslug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<CollectionSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const tenant = list.find((x) => x.tenant.slug === slug) || null;
        if (!tenant) throw new Error('Tenant not found');
        setTenant(tenant);
        try {
          const cols = await fetchTenantCollections(tenant.tenantId);
          setItems(cols);
          setError(null);
        } catch (e) {
          console.error('Failed to load collections:', e);
          setError(e instanceof Error ? e.message : 'Failed to load collections');
          setItems([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load collections');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setCreating(true);
    try {
      const created = await createCollection(tenant.tenantId, { name, slug: cslug });
      setItems((prev) => [created, ...prev]);
      setOpen(false);
      setName('');
      setCslug('');
      push({ tone: 'success', message: 'Collection created' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (slugToDelete: string) => {
    if (!tenant) return;
    try {
      await deleteCollection(tenant.tenantId, slugToDelete);
      setItems((prev) => prev.filter((x) => x.slug !== slugToDelete));
      push({ tone: 'success', message: 'Collection deleted' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections · {slug}</h1>
        <div className="flex items-center gap-2">
          {tenant && canEditContent(tenant.role) && (
            <>
              <Button onClick={() => setOpen(true)}>New Collection</Button>
              <Button variant="outline" onClick={() => { setQuickAdd((v)=>!v); setName(''); setCslug(''); setSlugTouched(false); }}>Quick Add</Button>
            </>
          )}
          <Link href={`/tenant/${encodeURIComponent(slug)}`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {quickAdd && tenant && canEditContent(tenant.role) && (
        <Card className="mb-4">
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault(); if (!tenant) return; setCreating(true);
                try {
                  const created = await createCollection(tenant.tenantId, { name, slug: cslug });
                  setItems((prev) => [created, ...prev]);
                  setName(''); setCslug(''); setSlugTouched(false); setQuickAdd(false);
                  push({ tone: 'success', message: 'Collection created' });
                } catch (err) {
                  push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
                } finally { setCreating(false); }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setQuickAdd(false); } }}
            >
              <Input autoFocus label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <div className="flex items-center gap-2">
                  <input className={"border rounded w-full p-2 " + (cslug && !isValidSlug(cslug) ? 'border-red-500' : '')} value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} required />
                  <Button type="button" variant="outline" size="sm" onClick={() => setCslug(slugify(name))}>Generate</Button>
                </div>
                {cslug && !isValidSlug(cslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setQuickAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={creating || !isValidSlug(cslug)} isLoading={creating}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton variant="text" width={160} height={20} className="mb-2" />
                    <Skeleton variant="text" width={112} height={12} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton variant="rectangular" width={80} height={36} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div className="text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Create your first collection to start organizing content"
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="6" />
              <rect x="3" y="14" width="18" height="6" />
            </svg>
          }
          action={
            tenant && canEditContent(tenant.role)
              ? {
                  label: 'Create Collection',
                  onClick: () => setQuickAdd(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Search */}
          <Card><CardContent>
            <Input
              type="text"
              placeholder="Search collections by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardContent></Card>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter((it) => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return it.name.toLowerCase().includes(query) || it.slug.toLowerCase().includes(query);
                    })
                    .map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-muted">{it.slug}</TableCell>
                      <TableCell>{it.itemsCount ? `${it.itemsCount} items` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/tenant/${encodeURIComponent(slug)}/collections/${encodeURIComponent(it.slug)}/items`}>
                            <Button variant="outline" size="sm">View Items</Button>
                          </Link>
                          {tenant && canEditContent(tenant.role) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
                                    const url = `${baseUrl}/collections/${it.slug}`;
                                    await navigator.clipboard.writeText(url);
                                    push({ tone: 'success', message: 'API URL copied to clipboard' });
                                  } catch { push({ tone: 'error', message: 'Cannot copy to clipboard' }); }
                                }}
                              >
                                Copy API
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setEditItem(it); setName(it.name); setCslug(it.slug); setSlugTouched(false); }}
                              >
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => onDelete(it.slug)}>Delete</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {items.filter((it) => {
            if (!searchQuery) return false;
            const query = searchQuery.toLowerCase();
            return !it.name.toLowerCase().includes(query) && !it.slug.toLowerCase().includes(query);
          }).length > 0 && (
            <Card><CardContent>
              <p className="text-muted text-sm">
                {items.filter((it) => {
                  if (!searchQuery) return false;
                  const query = searchQuery.toLowerCase();
                  return !it.name.toLowerCase().includes(query) && !it.slug.toLowerCase().includes(query);
                }).length} collection(s) hidden by search filter
              </p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Edit Form */}
      {editItem && tenant && canEditContent(tenant.role) && (
        <Card className="mb-4">
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault(); if (!tenant || !editItem) return; setSaving(true);
                try {
                  const updated = await updateCollection(tenant.tenantId, editItem.slug, { name, slug: cslug });
                  setItems((prev) => prev.map((x) => (x.id === editItem.id ? { ...x, ...updated } : x)));
                  setEditItem(null); setName(''); setCslug('');
                  push({ tone: 'success', message: 'Collection updated' });
                } catch (err) {
                  push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
                } finally { setSaving(false); }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <div className="flex items-center gap-2">
                    <input className={"border rounded w-full p-2 " + (cslug && !isValidSlug(cslug) ? 'border-red-500' : '')} value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} required />
                    <Button type="button" variant="outline" size="sm" onClick={() => setCslug(slugify(name))}>Generate</Button>
                  </div>
                  {cslug && !isValidSlug(cslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setEditItem(null); }}>Cancel</Button>
                <Button type="submit" disabled={saving || !isValidSlug(cslug)} isLoading={saving}>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New Collection">
        <form onSubmit={onCreate} className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
          <Input label="Slug" value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} error={cslug && !isValidSlug(cslug) ? 'Use lowercase letters, numbers, and hyphens' : undefined} required />
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating || !isValidSlug(cslug)} isLoading={creating}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal removed in favor of inline editing */}
    </div>
  );
}
