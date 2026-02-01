"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, EmptyState, LoadingSpinner } from '@repo/ui';
import { MediaGrid } from './grid/MediaGrid';
import { MediaSidebar } from './sidebar/MediaSidebar';
import { MediaPreviewPanel } from './preview/MediaPreviewPanel';
import { MediaToolbar } from './toolbar/MediaToolbar';
import { MediaFilter, MediaItem, MediaType } from './types';
import { fetchMySites } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Media } from '@repo/sdk';
import type { MediaItem as ApiMediaItem } from '@repo/sdk';

function matchesFilter(item: MediaItem, filter: MediaFilter) {
  if (filter === 'all') return true;
  if (filter === 'images') return item.type === 'image';
  if (filter === 'videos') return item.type === 'video';
  if (filter === 'documents') return item.type === 'document';
  return false;
}

function humanFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function deriveType(mime: string): MediaType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || mime.includes('word') || mime.startsWith('text/')) return 'document';
  return 'other';
}

function mapMediaItem(apiItem: ApiMediaItem & { fileName?: string; width?: number; height?: number; path?: string }): MediaItem {
  const mimeType = apiItem.mimeType || '';
  const type = deriveType(mimeType);
  const fileName = apiItem.fileName || apiItem.filename || 'untitled';
  const extension = fileName?.split('.').pop()?.toUpperCase?.() || mimeType.split('/').pop() || 'FILE';
  const dimensions = apiItem.width && apiItem.height ? `${apiItem.width}x${apiItem.height}` : undefined;
  return {
    id: apiItem.id,
    fileName,
    url: apiItem.url,
    mimeType,
    size: apiItem.size || 0,
    width: apiItem.width,
    height: apiItem.height,
    createdAt: apiItem.createdAt,
    alt: apiItem.alt,
    path: apiItem.path,
    metadata: apiItem.metadata,
    type,
    extension,
    dimensions,
    sizeLabel: humanFileSize(apiItem.size || 0),
    isImage: type === 'image',
  };
}

type Props = { siteSlug: string };

export function MediaManager({ siteSlug }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const [siteId, setSiteId] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sites = await fetchMySites();
        const match = sites.find((s) => s.site.slug === siteSlug || s.siteId === siteSlug);
        if (match && mounted) setSiteId(match.siteId);
      } catch (error) {
        push({ tone: 'error', message: error instanceof Error ? error.message : 'Failed to load site' });
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push, siteSlug]);

  const loadMedia = useCallback(async (siteId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await Media.listMedia(siteId);
      setItems(data.map(mapMediaItem));
      setSelectedId((prev) => (prev && data.some((d) => d.id === prev) ? prev : undefined));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load media';
      setError(message);
      push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    if (siteId) loadMedia(siteId);
  }, [loadMedia, siteId]);

  const filteredItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = matchesFilter(item, activeFilter);
      const matchesSearch =
        term === '' ||
        item.fileName.toLowerCase().includes(term) ||
        item.mimeType.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, items, searchQuery]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(undefined);
      return;
    }
    if (selectedId && filteredItems.some((item) => item.id === selectedId)) return;
    setSelectedId(filteredItems[0].id);
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesUpload = useCallback(async (files: FileList | File[]) => {
    if (!siteId) return;
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setUploading(true);
    try {
      const uploadedItems: MediaItem[] = [];
      for (const file of list) {
        const uploaded = await Media.uploadMedia(siteId, file);
        uploadedItems.push(mapMediaItem(uploaded));
      }
      if (uploadedItems.length > 0) {
        setItems((prev) => [...uploadedItems, ...prev]);
        setSelectedId(uploadedItems[0].id);
      }
      push({ tone: 'success', message: 'Files uploaded' });
    } catch (error) {
      push({ tone: 'error', message: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }, [push, siteId]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await handleFilesUpload(files);
    event.target.value = '';
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!uploading) setIsDragOver(true);
  }, [uploading]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    await handleFilesUpload(files);
  }, [handleFilesUpload, uploading]);

  const handleDelete = async () => {
    if (!siteId || !selectedItem) return;
    const confirmed = window.confirm(`Delete ${selectedItem.fileName}? This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await Media.deleteMedia(siteId, selectedItem.id);
      setItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setSelectedId(undefined);
      push({ tone: 'success', message: 'File deleted' });
    } catch (error) {
      push({ tone: 'error', message: error instanceof Error ? error.message : 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  };

  if (!siteId) {
    return (
      <Card className="p-6">
        <EmptyState title="Loading site" description="Resolving site access..." />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,application/pdf"
        onChange={handleFileChange}
      />

      <Card className="p-0">
        <MediaSidebar activeFilter={activeFilter} onFilterSelect={setActiveFilter} />
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <MediaToolbar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onUploadClick={handleUploadClick}
            onDeleteClick={selectedItem ? handleDelete : undefined}
            disableDelete={!selectedItem || deleting}
            uploadDisabled={uploading}
            error={error || undefined}
            isLoading={loading}
          />
        </Card>

        {loading && (
          <Card className="p-6">
            <LoadingSpinner text="Loading media..." />
          </Card>
        )}

        {!loading && (
          <MediaGrid
            items={filteredItems}
            selectedId={selectedItem?.id}
            onSelect={setSelectedId}
            isDragOver={isDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}
      </div>

      <Card className="p-0">
        <MediaPreviewPanel item={selectedItem} onDelete={handleDelete} />
      </Card>
    </div>
  );
}
