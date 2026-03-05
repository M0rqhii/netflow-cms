/**
 * Media Picker Dialog
 * 
 * Dialog do wyboru mediów z biblioteki site'u.
 * Media są izolowane per-site - każdy site ma swoją bibliotekę.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiX, FiUpload, FiSearch, FiImage, FiCheck, FiFileText, FiPlay } from 'react-icons/fi';
import { useSiteId } from '../../PageBuilderContext';
import { fetchSiteMedia, uploadSiteMedia, type MediaItem } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';
import styles from './MediaPickerDialog.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface MediaPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, mediaItem?: MediaItem) => void;
  /** Typ akceptowanych plików: 'image' | 'video' | 'all' */
  acceptType?: 'image' | 'video' | 'all';
  /** Aktualnie wybrana wartość (URL) */
  currentValue?: string;
}

type MediaFilter = 'all' | 'images' | 'videos' | 'documents';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function deriveMediaType(mime: string): 'image' | 'video' | 'document' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || mime.includes('word') || mime.startsWith('text/')) return 'document';
  return 'other';
}

function fileExtension(name: string, mime: string): string {
  const ext = name?.split('.').pop()?.toUpperCase();
  if (ext && ext.length <= 5) return ext;
  const fromMime = mime?.split('/').pop()?.toUpperCase();
  return fromMime || 'FILE';
}

function humanFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MediaPickerDialog: React.FC<MediaPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  acceptType = 'all',
  currentValue,
}) => {
  const siteId = useSiteId();
  const t = useTranslations();
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [isDragOver, setIsDragOver] = useState(false);

  // Load media when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    
    const loadMedia = async () => {
      setLoading(true);
      setError(null);
      try {
        const mediaItems = await fetchSiteMedia(siteId);
        setItems(mediaItems);
        
        // Pre-select if currentValue matches any item
        if (currentValue) {
          const match = mediaItems.find(item => item.url === currentValue);
          if (match) {
            setSelectedId(match.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setLoading(false);
      }
    };
    
    loadMedia();
  }, [isOpen, siteId, currentValue]);

  // Filter items based on acceptType, filter, and search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const type = deriveMediaType(item.mime);
      
      // Filter by acceptType
      if (acceptType === 'image' && type !== 'image') return false;
      if (acceptType === 'video' && type !== 'video') return false;
      
      // Filter by selected filter
      if (filter === 'images' && type !== 'image') return false;
      if (filter === 'videos' && type !== 'video') return false;
      if (filter === 'documents' && type !== 'document' && type !== 'other') return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fileName = item.fileName?.toLowerCase() || '';
        if (!fileName.includes(query)) return false;
      }
      
      return true;
    });
  }, [items, acceptType, filter, searchQuery]);

  // Handle file upload
  const handleFilesUpload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (list.length == 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadedItems: MediaItem[] = [];
      for (const file of list) {
        const uploaded = await uploadSiteMedia(siteId, file);
        uploadedItems.push(uploaded);
      }
      if (uploadedItems.length > 0) {
        setItems(prev => [...uploadedItems, ...prev]);
        setSelectedId(uploadedItems[0].id);
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

  // Handle selection confirm
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

  const handleConfirm = useCallback(() => {
    const selected = items.find(item => item.id === selectedId);
    if (selected) {
      onSelect(selected.url, selected);
      onClose();
    }
  }, [items, selectedId, onSelect, onClose]);

  const handleClear = useCallback(() => {
    onSelect('', undefined);
    onClose();
  }, [onSelect, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && selectedId) {
        handleConfirm();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedId, handleConfirm]);

  if (!isOpen) return null;

  const selectedItem = items.find(item => item.id === selectedId);
  const acceptMime = acceptType === 'image' ? 'image/*' : acceptType === 'video' ? 'video/*' : '*/*';

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.dialog}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {acceptType === 'image' ? t('mediaPicker.selectImage') : acceptType === 'video' ? t('mediaPicker.selectVideo') : t('mediaPicker.selectMedia')}
          </h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Search */}
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t('mediaPicker.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Filters */}
          {acceptType === 'all' && (
            <div className={styles.filters}>
              <button
                className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                {t('mediaPicker.filterAll')}
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'images' ? styles.active : ''}`}
                onClick={() => setFilter('images')}
              >
                {t('mediaPicker.filterImages')}
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'videos' ? styles.active : ''}`}
                onClick={() => setFilter('videos')}
              >
                {t('mediaPicker.filterVideos')}
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'documents' ? styles.active : ''}`}
                onClick={() => setFilter('documents')}
              >
                {t('mediaPicker.filterDocuments')}
              </button>
            </div>
          )}

          {/* Upload */}
          <label className={styles.uploadButton}>
            <FiUpload />
            <span>{t('mediaPicker.upload')}</span>
            <input
              type="file"
              accept={acceptMime} multiple
              onChange={handleUpload}
              disabled={uploading}
              className={styles.hiddenInput}
            />
          </label>
        </div>

        {/* Content */}
        <div
          className={`${styles.content} ${isDragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className={styles.dropOverlay}>{t('mediaPicker.dropLabel')}</div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={styles.loading}>
              {t('mediaPicker.loading')}
            </div>
          )}

          {/* Uploading overlay */}
          {uploading && (
            <div className={styles.uploading}>
              {t('mediaPicker.uploading')}
            </div>
          )}

          {/* Grid */}
          {!loading && filteredItems.length > 0 && (
            <div className={styles.grid}>
              {filteredItems.map(item => {
                const type = deriveMediaType(item.mime);
                const isSelected = item.id === selectedId;
                const ext = fileExtension(item.fileName, item.mime);

                return (
                  <button
                    key={item.id}
                    className={`${styles.gridItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    {type === 'image' ? (
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.alt || item.fileName}
                        className={styles.thumbnail}
                        width={160}
                        height={160}
                      />
                    ) : type === 'video' ? (
                      <div className={styles.videoThumbWrap}>
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className={styles.thumbnail}
                            width={160}
                            height={160}
                          />
                        ) : null}
                        <span className={styles.videoOverlay}>
                          <FiPlay className={styles.videoPlayIcon} />
                        </span>
                      </div>
                    ) : (
                      <div className={styles.filePlaceholder}>
                        <FiFileText className={styles.fileIcon} />
                        <span className={styles.fileExt}>{ext}</span>
                      </div>
                    )}
                    <div className={styles.itemName}>{item.fileName}</div>
                    {isSelected && (
                      <div className={styles.selectedBadge}>
                        <FiCheck />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredItems.length === 0 && (
            <div className={styles.empty}>
              <FiImage className={styles.emptyIcon} />
              <p>{t('mediaPicker.emptyTitle')}</p>
              <p className={styles.emptyHint}>
                {t('mediaPicker.emptyHint')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.selectedPreview}>
            {selectedItem ? (
              <>
                <div className={styles.previewArea}>
                  {deriveMediaType(selectedItem.mime) === 'image' ? (
                    <img
                      src={selectedItem.thumbnailUrl || selectedItem.url}
                      alt=""
                      className={styles.previewThumb}
                      width={56}
                      height={56}
                    />
                  ) : deriveMediaType(selectedItem.mime) === 'video' ? (
                    <div className={styles.previewVideoWrap}>
                      {selectedItem.thumbnailUrl ? (
                        <img src={selectedItem.thumbnailUrl} alt="" width={56} height={56} className={styles.previewThumb} />
                      ) : (
                        <FiPlay className={styles.previewVideoIcon} />
                      )}
                    </div>
                  ) : (
                    <div className={styles.previewDocWrap}>
                      <FiFileText className={styles.previewDocIcon} />
                      <span className={styles.previewExt}>{fileExtension(selectedItem.fileName, selectedItem.mime)}</span>
                    </div>
                  )}
                </div>
                <div className={styles.selectedInfo}>
                  <span className={styles.selectedName}>{selectedItem.fileName}</span>
                  <span className={styles.selectedSize}>{humanFileSize(selectedItem.size)}</span>
                </div>
              </>
            ) : (
              <span className={styles.noSelection}>{t('mediaPicker.noSelection')}</span>
            )}
          </div>
          <div className={styles.footerActions}>
            {currentValue && (
              <button type="button" onClick={handleClear} className={styles.clearButton}>
                {t('mediaPicker.clear')}
              </button>
            )}
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              {t('mediaPicker.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedId}
              className={styles.confirmButton}
            >
              {t('mediaPicker.select')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerDialog;


