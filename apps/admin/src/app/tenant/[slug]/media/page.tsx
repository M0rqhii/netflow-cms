"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import { fetchTenantMedia, uploadTenantMedia, type MediaItem } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';

export default function TenantMediaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyTenants();
        const t = list.find((x) => x.tenant.slug === slug) || null;
        if (!t) throw new Error('Tenant not found');
        setTenant(t);
        const rows = await fetchTenantMedia(t.tenantId).catch(() => []);
        setItems(rows);
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

  return (
    <div
      className={`container py-8 ${dragOver ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 rounded-xl' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media · {slug}</h1>
        <div className="flex items-center gap-2">
          <label className="btn btn-primary">
            <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
            Upload
          </label>
          <Link href={`/tenant/${encodeURIComponent(slug)}`} className="btn btn-outline">Back</Link>
        </div>
      </div>

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
        <div className="card"><div className="card-body"><p className="text-muted">No media yet.</p></div></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((m) => {
            const isImage = /^image\//i.test(m.mime);
            return (
              <div key={m.id} className="card overflow-hidden">
                <div className="aspect-square w-full bg-white flex items-center justify-center">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumbnailUrl || m.url} alt={m.filename} className="h-full w-full object-cover" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 14 2-2 3 3 2-2 2 2"/></svg>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium truncate" title={m.filename}>{m.filename}</div>
                  <div className="text-xs text-muted">{(m.size/1024).toFixed(1)} KB</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Uploads in progress */}
        {Object.keys(progress).length > 0 && (
          <div className="card mt-4"><div className="card-body">
            <h3 className="font-semibold mb-2">Uploads</h3>
            <div className="space-y-2">
              {Object.entries(progress).map(([key, pct]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded">
                    <div className="h-2 rounded bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted" style={{ minWidth: 28 }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div></div>
        )}
      )}
    </div>
  );
}
