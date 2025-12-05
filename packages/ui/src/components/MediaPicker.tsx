import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Modal, Button, Card, CardContent, Input } from '../index';

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mime: string;
  size: number;
}

export interface MediaPickerProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  fetchMedia: () => Promise<MediaItem[]>;
  className?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  value,
  onChange,
  multiple = false,
  label,
  required,
  error,
  helperText,
  fetchMedia,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchMedia()
        .then(setMediaItems)
        .catch(() => setMediaItems([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, fetchMedia]);

  const selectedIds = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (value ? [value] : []);

  const handleSelect = (mediaId: string) => {
    if (multiple) {
      const newValue = selectedIds.includes(mediaId)
        ? selectedIds.filter(id => id !== mediaId)
        : [...selectedIds, mediaId];
      onChange(newValue);
    } else {
      onChange(mediaId);
      setIsOpen(false);
    }
  };

  const handleRemove = (mediaId: string) => {
    if (multiple) {
      onChange(selectedIds.filter(id => id !== mediaId));
    } else {
      onChange('');
    }
  };

  const filteredMedia = mediaItems.filter(m =>
    !searchQuery || m.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMedia = mediaItems.filter(m => selectedIds.includes(m.id));

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Selected Media Preview */}
      {selectedMedia.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedMedia.map((media) => {
            const isImage = /^image\//i.test(media.mime);
            return (
              <div key={media.id} className="relative group">
                <div className="w-20 h-20 border rounded overflow-hidden bg-gray-100">
                  {isImage ? (
                    <img
                      src={media.thumbnailUrl || media.url}
                      alt={media.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m10 14 2-2 3 3 2-2 2 2" />
                      </svg>
                    </div>
                  )}
                </div>
                {!multiple && (
                  <button
                    type="button"
                    onClick={() => handleRemove(media.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
                <div className="text-xs truncate mt-1 max-w-[80px]" title={media.filename}>
                  {media.filename}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        {selectedMedia.length > 0 ? (multiple ? `Add More (${selectedMedia.length} selected)` : 'Change') : 'Select Media'}
      </Button>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}

      {/* Media Picker Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Media" size="xl">
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded" />
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <p className="text-muted text-center py-8">No media found</p>
          ) : (
            <div className="grid grid-cols-4 gap-4 max-h-[500px] overflow-y-auto">
              {filteredMedia.map((media) => {
                const isImage = /^image\//i.test(media.mime);
                const isSelected = selectedIds.includes(media.id);
                return (
                  <Card
                    key={media.id}
                    variant={isSelected ? 'outlined' : 'default'}
                    className={clsx(
                      'cursor-pointer transition-all',
                      isSelected && 'ring-2 ring-blue-500'
                    )}
                    onClick={() => handleSelect(media.id)}
                  >
                    <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={media.thumbnailUrl || media.url}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="m10 14 2-2 3 3 2-2 2 2" />
                        </svg>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <div className="text-xs font-medium truncate" title={media.filename}>
                        {media.filename}
                      </div>
                      {isSelected && (
                        <div className="text-xs text-blue-600 mt-1">✓ Selected</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {multiple && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Done ({selectedIds.length} selected)
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

