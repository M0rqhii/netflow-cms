"use client";

/**
 * Assets Panel - lightweight media browser for the builder.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { FiUpload, FiSearch, FiFile } from 'react-icons/fi';
import { useSiteId } from '../PageBuilderContext';
import { fetchSiteMedia, uploadSiteMedia, type MediaItem } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';

function deriveMediaType(mime: string): 'image' | 'video' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'other';
}

export function AssetsPanel() {
  const siteId = useSiteId();
  const t = useTranslations();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mediaItems = await fetchSiteMedia(siteId);
      setItems(mediaItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFilesUpload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setUploading(true);
    setError(null);
    const uploadedItems: MediaItem[] = [];
    try {
      for (const file of list) {
        const uploaded = await uploadSiteMedia(siteId, file);
        uploadedItems.push(uploaded);
      }
      if (uploadedItems.length > 0) {
        setItems((prev) => [...uploadedItems, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [siteId]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFilesUpload(files);
    e.target.value = '';
  }, [handleFilesUpload]);

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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => (item.fileName || '').toLowerCase().includes(query));
  }, [items, searchQuery]);

  return (
    <div className="builder-assets-panel">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder={t('builderAssets.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ paddingLeft: 32 }}
        />
      </div>

      <label className="builder-assets-upload">
        <FiUpload />
        <span>{uploading ? t('builderAssets.uploading') : t('builderAssets.upload')}</span>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      <div
        className={`builder-assets-scroll ${isDragOver ? 'is-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="builder-assets-drop-overlay">{t('builderAssets.dropLabel')}</div>
        )}

        {error && <div className="builder-assets-error">{error}</div>}

        {loading ? (
          <div className="text-xs text-muted">{t('builderAssets.loading')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-xs text-muted text-center py-6">{t('builderAssets.empty')}</div>
        ) : (
          <div className="builder-assets-grid">
            {filteredItems.map((item) => {
              const type = deriveMediaType(item.mime);
              return (
                <div key={item.id} className="builder-asset-card">
                  {type === 'image' ? (
                    <Image
                      src={item.url}
                      alt={item.alt || item.fileName || ''}
                      className="builder-asset-image"
                      width={160}
                      height={80}
                      sizes="160px"
                      unoptimized
                    />
                  ) : (
                    <div className="builder-asset-fallback">
                      <FiFile />
                    </div>
                  )}
                  <div className="builder-asset-name">{item.fileName}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetsPanel;
