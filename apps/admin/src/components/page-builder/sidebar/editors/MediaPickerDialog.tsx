/**
 * Media Picker Dialog
 * 
 * Dialog do wyboru mediów z biblioteki site'u.
 * Media są izolowane per-site - każdy site ma swoją bibliotekę.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiX, FiUpload, FiSearch, FiImage, FiFile, FiCheck } from 'react-icons/fi';
import { useSiteId } from '../../PageBuilderContext';
import { fetchSiteMedia, uploadSiteMedia, type MediaItem } from '@/lib/api';
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

type MediaFilter = 'all' | 'images' | 'videos';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function deriveMediaType(mime: string): 'image' | 'video' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'other';
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
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');

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
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const uploaded = await uploadSiteMedia(siteId, file);
      setItems(prev => [uploaded, ...prev]);
      setSelectedId(uploaded.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [siteId]);

  // Handle selection confirm
  const handleConfirm = useCallback(() => {
    const selected = items.find(item => item.id === selectedId);
    if (selected) {
      onSelect(selected.url, selected);
      onClose();
    }
  }, [items, selectedId, onSelect, onClose]);

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
            {acceptType === 'image' ? 'Select Image' : acceptType === 'video' ? 'Select Video' : 'Select Media'}
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
              placeholder="Search files..."
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
                All
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'images' ? styles.active : ''}`}
                onClick={() => setFilter('images')}
              >
                Images
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'videos' ? styles.active : ''}`}
                onClick={() => setFilter('videos')}
              >
                Videos
              </button>
            </div>
          )}

          {/* Upload */}
          <label className={styles.uploadButton}>
            <FiUpload />
            <span>Upload</span>
            <input
              type="file"
              accept={acceptMime}
              onChange={handleUpload}
              disabled={uploading}
              className={styles.hiddenInput}
            />
          </label>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={styles.loading}>
              Loading media...
            </div>
          )}

          {/* Uploading overlay */}
          {uploading && (
            <div className={styles.uploading}>
              Uploading...
            </div>
          )}

          {/* Grid */}
          {!loading && filteredItems.length > 0 && (
            <div className={styles.grid}>
              {filteredItems.map(item => {
                const type = deriveMediaType(item.mime);
                const isSelected = item.id === selectedId;
                
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
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.filePlaceholder}>
                        <FiFile className={styles.fileIcon} />
                      </div>
                    )}
                    
                    <div className={styles.itemName}>
                      {item.fileName}
                    </div>
                    
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
              <p>No media files found</p>
              <p className={styles.emptyHint}>
                Upload files to your site's media library
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {selectedItem && (
            <div className={styles.selectedInfo}>
              <span className={styles.selectedName}>{selectedItem.fileName}</span>
              <span className={styles.selectedSize}>{humanFileSize(selectedItem.size)}</span>
            </div>
          )}
          
          <div className={styles.footerActions}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className={styles.confirmButton}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerDialog;
