import React from 'react';
import { Card, CardContent, EmptyState } from '@repo/ui';
import { MediaItem } from '../types';
import { MediaGridItem } from './MediaGridItem';

interface MediaGridProps {
  items: MediaItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  isDragOver?: boolean;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function MediaGrid({
  items,
  selectedId,
  onSelect,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: MediaGridProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Showing {items.length} files</span>
          <span className="text-[11px] uppercase tracking-wide">Grid preview</span>
        </div>

        <div
          className={`relative rounded-lg border border-dashed border-transparent ${
            isDragOver ? 'border-blue-400 bg-blue-50/40' : ''
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-blue-700 bg-white/70 z-10 rounded-lg">
              Drop files to upload
            </div>
          )}

          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => onSelect?.(item.id)}>
                  <MediaGridItem item={item} selected={item.id === selectedId} />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6">
              <EmptyState
                title="No files in this view"
                description="Use the filters or search to refine results."
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
