import React from 'react';
import { Card, CardContent, EmptyState } from '@repo/ui';
import { MediaItem } from '../types';
import { MediaGridItem } from './MediaGridItem';

interface MediaGridProps {
  items: MediaItem[];
  selectedId?: string;
}

export function MediaGrid({ items, selectedId }: MediaGridProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Showing {items.length} placeholder files</span>
          <span className="text-[11px] uppercase tracking-wide">Grid preview</span>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <MediaGridItem key={item.id} item={item} selected={item.id === selectedId} />
            ))}
          </div>
        ) : (
          <div className="py-6">
            <EmptyState
              title="No files in this view"
              description="Use the filters or search to refine the placeholder dataset."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
