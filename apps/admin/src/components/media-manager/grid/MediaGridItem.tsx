import React from 'react';
import { clsx } from 'clsx';
import { MediaItem } from '../types';

interface MediaGridItemProps {
  item: MediaItem;
  selected?: boolean;
}

const toneStyles: Record<MediaItem['thumbnailTone'], string> = {
  cool: 'from-blue-50 to-blue-100 text-blue-700',
  warm: 'from-amber-50 to-orange-100 text-amber-700',
  neutral: 'from-gray-50 to-gray-100 text-gray-700',
};

export function MediaGridItem({ item, selected }: MediaGridItemProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-3 shadow-sm transition-colors',
        selected
          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-blue-200'
      )}
    >
      <div
        className={clsx(
          'aspect-square w-full rounded-md bg-gradient-to-br flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide',
          toneStyles[item.thumbnailTone]
        )}
      >
        {item.extension}
      </div>

      <div className="mt-2 space-y-1">
        <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
        <div className="flex items-center justify-between text-[11px] uppercase text-muted">
          <span>{item.type}</span>
          {item.dimensions && <span className="tracking-wide">{item.dimensions}</span>}
        </div>
      </div>
    </div>
  );
}
