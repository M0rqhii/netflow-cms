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
    if (list.length == 0) return;

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
    if (!files || files.length == 0) return;
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
    if (!files || files.length == 0) return;
    await handleFilesUpload(files);
  }, [handleFilesUpload, uploading]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => (item.fileName || '').toLowerCase().includes(query));
  }, [items, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('builderAssets.title')}</h2>
        <p className="text-[11px] text-gray-500">{t('builderAssets.dropHint')}</p>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj plików..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
          <FiUpload />
          <span>{uploading ? t('builderAssets.uploading') : t('builderAssets.upload')}</span>
          <input
            type="file"
            accept="image/*,video/*" multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-3 relative ${isDragOver ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/30' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-3 border-2 border-dashed border-blue-400 rounded-md flex items-center justify-center text-sm text-blue-700 bg-white/70 pointer-events-none">
            {t('builderAssets.dropLabel')}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-xs text-muted">{t('builderAssets.loading')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-xs text-muted text-center py-6">{t('builderAssets.empty')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredItems.map((item) => {
              const type = deriveMediaType(item.mime);
              return (
                <div key={item.id} className="border border-gray-200 rounded-md overflow-hidden">
                  {type === 'image' ? (
                    <Image src={item.url} alt={item.alt || item.fileName || ""} className="h-20 w-full object-cover" width={160} height={80} sizes="160px" unoptimized />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-gray-400">
                      <FiFile />
                    </div>
                  )}
                  <div className="px-2 py-1 text-[11px] text-gray-600 truncate">
                    {item.fileName}
                  </div>
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
