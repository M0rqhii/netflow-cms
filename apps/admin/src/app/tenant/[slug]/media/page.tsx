"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import { fetchTenantMedia, uploadTenantMedia, updateMediaItem, deleteMediaItem, type MediaItem } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { Modal, Button, Card, CardContent, Input } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useTranslations } from '@/hooks/useTranslations';
import { canEditContent } from '@/lib/rbac';

export default function TenantMediaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [editModal, setEditModal] = useState<MediaItem | null>(null);
  const [altText, setAltText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; mediaId: string; filename: string }>({ open: false, mediaId: '', filename: '' });
  const { push } = useToast();
  const t = useTranslations();

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const tenant = list.find((x) => x.tenant.slug === slug) || null;
        if (!tenant) throw new Error('Tenant not found');
        setTenant(tenant);
        try {
          const rows = await fetchTenantMedia(tenant.tenantId);
          setItems(rows);
          setError(null);
        } catch (e) {
          console.error('Failed to load media:', e);
          setError(e instanceof Error ? e.message : 'Failed to load media');
          setItems([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const uploadFile = useCallback(async (file: File) => {
    if (!tenant) return;
    // Use XHR for progress events
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress((p) => ({ ...p, [key]: Math.round((e.loaded / e.total) * 100) }));
      };
      xhr.onreadystatechange = async () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const saved: MediaItem = JSON.parse(xhr.responseText);
              setItems((prev) => [saved, ...prev]);
              setProgress((p) => ({ ...p, [key]: 100 }));
              push({ tone: 'success', message: `Uploaded ${file.name}` });
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(xhr.responseText || xhr.statusText));
          }
        }
      };
      const form = new FormData();
      form.append('file', file);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      xhr.open('POST', `${baseUrl}/media`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('authToken') || ''}`);
      xhr.setRequestHeader('X-Tenant-ID', tenant.tenantId);
      xhr.send(form);
    });
  }, [tenant, push]);

  const onUpload = async (files: FileList | null) => {
    if (!tenant || !files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try { await uploadFile(f); } catch (err) { push({ tone: 'error', message: err instanceof Error ? err.message : `Failed to upload ${f.name}` }); }
    }
  };

  const onEdit = async () => {
    if (!tenant || !editModal) return;
    setSaving(true);
    try {
      const updated = await updateMediaItem(tenant.tenantId, editModal.id, {
        alt: altText || undefined,
      });
      setItems((prev) => prev.map((item) => (item.id === editModal.id ? updated : item)));
      setEditModal(null);
      setAltText('');
      push({ tone: 'success', message: 'Media updated' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (mediaId: string) => {
    if (!tenant) return;
    const item = items.find(i => i.id === mediaId);
    setDeleteConfirm({ open: true, mediaId, filename: item?.filename || 'this file' });
  };

  const confirmDelete = async () => {
    if (!tenant) return;
    try {
      await deleteMediaItem(tenant.tenantId, deleteConfirm.mediaId);
      setItems((prev) => prev.filter((item) => item.id !== deleteConfirm.mediaId));
      push({ tone: 'success', message: 'Media deleted' });
      setDeleteConfirm({ open: false, mediaId: '', filename: '' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dark Header */}
      <div className="bg-surface border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Media · {slug}</h1>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
                <Button type="button">Upload</Button>
              </label>
              <Link href={`/tenant/${encodeURIComponent(slug)}`}>
                <Button variant="outline">Back</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
          {/* Drag & drop area */}
        <div
          className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center ${dragOver ? 'border-[var(--color-primary)] bg-white/40' : 'border-gray-300'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
        >
          <p className="text-sm text-muted">Drag & drop files here, or use Upload</p>
        </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <Card><CardContent><p className="text-muted">No media yet.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((m) => {
            const isImage = /^image\//i.test(m.mime);
            return (
              <Card key={m.id} className="overflow-hidden">
                <div className="aspect-square w-full bg-white flex items-center justify-center">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumbnailUrl || m.url} alt={m.filename} className="h-full w-full object-cover" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 14 2-2 3 3 2-2 2 2"/></svg>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="text-sm font-medium truncate" title={m.filename}>{m.filename}</div>
                  <div className="text-xs text-muted">{(m.size/1024).toFixed(1)} KB</div>
                  {tenant && canEditContent(tenant.role) && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditModal(m);
                          setAltText(m.alt || '');
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDelete(m.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Uploads in progress */}
      {Object.keys(progress).length > 0 && (
        <Card className="mt-4">
          <CardContent>
            <h3 className="font-semibold mb-2">Uploads</h3>
            <div className="space-y-2">
              {Object.entries(progress).map(([key, pct]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded">
                    <div className="h-2 rounded bg-blue-600" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted" style={{ minWidth: 28 }}>{pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => { setEditModal(null); setAltText(''); }} title="Edit Media">
        {editModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="space-y-3"
          >
            <Input
              label="Alt Text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Alternative text for image"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setEditModal(null); setAltText(''); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} isLoading={saving}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, mediaId: '', filename: '' })}
        onConfirm={confirmDelete}
        title="Usuń plik"
        message={`Czy na pewno chcesz usunąć plik "${deleteConfirm.filename}"? Ta operacja jest nieodwracalna.`}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
      </div>
    </div>
  );
}
