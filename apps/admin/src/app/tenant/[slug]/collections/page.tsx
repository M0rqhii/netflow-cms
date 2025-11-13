"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import { fetchTenantCollections, createCollection, deleteCollection, updateCollection, type CollectionSummary } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { canEditContent } from '@/lib/rbac';
import Modal from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/Input';
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
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const t = list.find((x) => x.tenant.slug === slug) || null;
        if (!t) throw new Error('Tenant not found');
        setTenant(t);
        const cols = await fetchTenantCollections(t.tenantId).catch(() => []);
        setItems(cols);
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
              <button className="btn btn-primary" onClick={() => setOpen(true)}>New (modal)</button>
              <button className="btn btn-outline" onClick={() => { setQuickAdd((v)=>!v); setName(''); setCslug(''); setSlugTouched(false); }}>Quick Add</button>
            </>
          )}
          <Link href={`/tenant/${encodeURIComponent(slug)}`} className="btn btn-outline">Back</Link>
        </div>
      </div>

      {quickAdd && tenant && canEditContent(tenant.role) && (
        <div className="card mb-4"><div className="card-body">
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
            <TextInput autoFocus label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <div className="flex items-center gap-2">
                <input className={"border rounded w-full p-2 " + (cslug && !isValidSlug(cslug) ? 'border-red-500' : '')} value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} required />
                <button type="button" className="btn btn-outline" onClick={() => setCslug(slugify(name))}>Generate</button>
              </div>
              {cslug && !isValidSlug(cslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setQuickAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating || !isValidSlug(cslug)}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div></div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body flex items-center justify-between">
              <div>
                <div className="skeleton h-5 w-40 mb-2" />
                <div className="skeleton h-3 w-28" />
              </div>
                <div className="flex items-center gap-2">
                  <span className="skeleton h-9 w-20" />
                </div>
              </div></div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <div className="card"><div className="card-body"><p className="text-muted">No collections yet.</p></div></div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="card"><div className="card-body">
              {tenant && canEditContent(tenant.role) && editItem?.id === it.id ? (
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
                    <TextInput label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug</label>
                      <div className="flex items-center gap-2">
                        <input className={"border rounded w-full p-2 " + (cslug && !isValidSlug(cslug) ? 'border-red-500' : '')} value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} required />
                        <button type="button" className="btn btn-outline" onClick={() => setCslug(slugify(name))}>Generate</button>
                      </div>
                      {cslug && !isValidSlug(cslug) && (<p className="text-xs text-red-600 mt-1">Use lowercase letters, numbers, and hyphens</p>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button type="button" className="btn btn-outline" onClick={() => { setEditItem(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving || !isValidSlug(cslug)}>{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-sm text-muted">{it.slug} {it.itemsCount ? `· ${it.itemsCount} items` : ''}</div>
                  </div>
                  {tenant && canEditContent(tenant.role) && (
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-outline"
                        title="Copy API path"
                        onClick={async () => {
                          try {
                            const path = `/api/v1/collections/${it.slug}`;
                            await navigator.clipboard.writeText(path);
                            push({ tone: 'success', message: 'API path copied' });
                          } catch { push({ tone: 'error', message: 'Cannot copy' }); }
                        }}
                      >Copy API</button>
                      <button className="btn btn-outline" onClick={() => { setEditItem(it); setName(it.name); setCslug(it.slug); setSlugTouched(false); }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => onDelete(it.slug)}>Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div></div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Collection">
        <form onSubmit={onCreate} className="space-y-3">
          <TextInput label="Name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setCslug(slugify(e.target.value)); }} required />
          <TextInput label="Slug" value={cslug} onChange={(e) => { setCslug(e.target.value); setSlugTouched(true); }} error={cslug && !isValidSlug(cslug) ? 'Use lowercase letters, numbers, and hyphens' : undefined} required />
          <div className="flex items-center gap-2 justify-end">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating || !isValidSlug(cslug)}>{creating ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit modal removed in favor of inline editing */}
    </div>
  );
}
