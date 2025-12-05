"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import { fetchTenantTypes, createType, deleteType, updateType, getContentType, type TypeSummary } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { canEditContent } from '@/lib/rbac';
import { Modal, Button, Input, Card, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingSpinner, EmptyState, Skeleton } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { slugify, isValidSlug } from '@/lib/slug';
import { FieldsEditor, type FieldDefinition } from '@/components/content/FieldsEditor';

export default function TenantTypesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TypeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tslug, setTslug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<TypeSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [editFields, setEditFields] = useState<FieldDefinition[]>([]);
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
          const rows = await fetchTenantTypes(tenant.tenantId);
          setItems(rows);
          setError(null);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Failed to load types';
          setError(errorMessage);
          setItems([]);
          // If 401, handleApiError already redirected to login, so don't show error
          if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
            return; // Redirect is happening
          }
          push({ tone: 'error', message: errorMessage });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load types');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, push]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setCreating(true);
    try {
      const created = await createType(tenant.tenantId, {
        name,
        slug: tslug,
        fields: fields.length > 0 ? fields : undefined,
      });
      setItems((prev) => [created, ...prev]);
      setOpen(false);
      setName('');
      setTslug('');
      setFields([]);
      push({ tone: 'success', message: 'Type created' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!tenant) return;
    try {
      await deleteType(tenant.tenantId, id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      push({ tone: 'success', message: 'Type deleted' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  // Filter content types based on search
  const filteredItems = searchQuery
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div className="min-h-screen bg-background">
      {/* Dark Header */}
      <div className="bg-surface border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Content Types · {slug}</h1>
            <Link href={`/tenant/${encodeURIComponent(slug)}`}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Search */}
        <Card className="mb-4">
          <CardContent>
            <input
              type="text"
              placeholder="Search content types by name or slug..."
              className="border rounded w-full p-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Quick Add */}
        {tenant && canEditContent(tenant.role) && (
          <div className="mb-4 flex items-center gap-2">
            <Button onClick={() => setOpen(true)}>New Content Type</Button>
            <Button variant="outline" onClick={() => { setQuickAdd((v)=>!v); setName(''); setTslug(''); setSlugTouched(false); }}>Quick Add</Button>
          </div>
        )}

      {quickAdd && tenant && canEditContent(tenant.role) && (
        <Card className="mb-4">
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault(); if (!tenant) return; setCreating(true);
                try {
                  const created = await createType(tenant.tenantId, {
                    name,
                    slug: tslug,
                    fields: fields.length > 0 ? fields : undefined,
                  });
                  setItems((prev) => [created, ...prev]);
                  setName(''); setTslug(''); setSlugTouched(false); setQuickAdd(false); setFields([]);
                  push({ tone: 'success', message: 'Type created' });
                } catch (err) {
                  push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to create' });
                } finally { setCreating(false); }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setQuickAdd(false); } }}
            >
              <Input autoFocus label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setTslug(slugify(e.target.value)); }} required />
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <div className="flex items-center gap-2">
                  <input className={"border rounded w-full p-2 " + (tslug && !isValidSlug(tslug) ? 'border-red-500' : '')} value={tslug} onChange={(e) => { setTslug(e.target.value); setSlugTouched(true); }} required />
                  <Button type="button" variant="outline" size="sm" onClick={() => setTslug(slugify(name))}>Generate</Button>
                </div>
                {tslug && !isValidSlug(tslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
              </div>
              <div className="md:col-span-2">
                <FieldsEditor
                  fields={fields}
                  onChange={setFields}
                  availableContentTypes={items.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setQuickAdd(false); setFields([]); }}>Cancel</Button>
                <Button type="submit" disabled={creating || !isValidSlug(tslug)} isLoading={creating}>Create</Button>
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
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "No content types yet" : "No content types found"}
          description={items.length === 0 ? "Create your first content type to define the structure of your content" : `No content types matching "${searchQuery}"`}
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          }
          action={
            tenant && canEditContent(tenant.role) && items.length === 0
              ? {
                  label: 'Create Content Type',
                  onClick: () => setOpen(true),
                }
              : items.length > 0
              ? {
                  label: 'Clear search',
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Link href={`/tenant/${encodeURIComponent(slug)}/content/${encodeURIComponent(it.slug)}`} className="text-blue-600 hover:underline font-medium">
                          {it.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tenant/${encodeURIComponent(slug)}/content/${encodeURIComponent(it.slug)}`} className="text-blue-600 hover:underline text-muted">
                          {it.slug}
                        </Link>
                      </TableCell>
                      <TableCell>{it.fieldsCount ? `${it.fieldsCount} fields` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/tenant/${encodeURIComponent(slug)}/content/${encodeURIComponent(it.slug)}`}>
                            <Button variant="outline" size="sm">View Entries</Button>
                          </Link>
                          {tenant && canEditContent(tenant.role) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
                                    const url = `${baseUrl}/content-types/${it.id}`;
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
                                onClick={async () => {
                                  setEditItem(it);
                                  setName(it.name);
                                  setTslug(it.slug);
                                  setSlugTouched(false);
                                  setEditFields([]);
                                  try {
                                    const existing = await getContentType(tenant.tenantId, it.id);
                                    if (existing.fields && Array.isArray(existing.fields)) {
                                      setEditFields(existing.fields as FieldDefinition[]);
                                    }
                                  } catch {}
                                }}
                              >
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => onDelete(it.id)}>Delete</Button>
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
                }).length} content type(s) hidden by search filter
              </p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editItem && tenant && canEditContent(tenant.role) && (
        <Card className="mb-4">
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault(); if (!tenant || !editItem) return; setSaving(true);
                try {
                  if (editFields.length === 0) {
                    try {
                      const existing = await getContentType(tenant.tenantId, editItem.id);
                      if (existing.fields && Array.isArray(existing.fields)) {
                        setEditFields(existing.fields as FieldDefinition[]);
                      }
                    } catch {}
                  }
                  const updated = await updateType(tenant.tenantId, editItem.id, {
                    name,
                    slug: tslug,
                    fields: editFields.length > 0 ? editFields : undefined,
                  });
                  setItems((prev) => prev.map((x) => (x.id === editItem.id ? { ...x, ...updated } : x)));
                  setEditItem(null); setName(''); setTslug(''); setEditFields([]);
                  push({ tone: 'success', message: 'Type updated' });
                } catch (err) {
                  push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
                } finally { setSaving(false); }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setTslug(slugify(e.target.value)); }} required />
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <div className="flex items-center gap-2">
                    <input className={"border rounded w-full p-2 " + (tslug && !isValidSlug(tslug) ? 'border-red-500' : '')} value={tslug} onChange={(e) => { setTslug(e.target.value); setSlugTouched(true); }} required />
                    <Button type="button" variant="outline" size="sm" onClick={() => setTslug(slugify(name))}>Generate</Button>
                  </div>
                  {tslug && !isValidSlug(tslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
                </div>
              </div>
              <FieldsEditor
                fields={editFields}
                onChange={setEditFields}
                availableContentTypes={items.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
              />
              <div className="flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setEditItem(null); setEditFields([]); }}>Cancel</Button>
                <Button type="submit" disabled={saving || !isValidSlug(tslug)} isLoading={saving}>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Modal isOpen={open} onClose={() => { setOpen(false); setFields([]); }} title="New Content Type" size="lg">
        <form onSubmit={onCreate} className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setTslug(slugify(e.target.value)); }} required />
          <Input label="Slug" value={tslug} onChange={(e) => { setTslug(e.target.value); setSlugTouched(true); }} error={tslug && !isValidSlug(tslug) ? 'Use lowercase letters, numbers, and hyphens' : undefined} required />
          <FieldsEditor
            fields={fields}
            onChange={setFields}
            availableContentTypes={items.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setFields([]); }}>Cancel</Button>
            <Button type="submit" disabled={creating || !isValidSlug(tslug)} isLoading={creating}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
