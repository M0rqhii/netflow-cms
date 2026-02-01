import React from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { MediaItem } from '../types';

interface MediaGridItemProps {
  item: MediaItem;
  selected?: boolean;
}

export function MediaGridItem({ item, selected }: MediaGridItemProps) {
  const showImage = item.isImage;

  return (
    <div
      className={clsx(
        'rounded-lg border p-3 shadow-sm transition-colors cursor-pointer',
        selected
          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-blue-200'
      )}
    >
      <div className="aspect-square w-full overflow-hidden rounded-md border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={item.url} alt={item.fileName} className="h-full w-full object-cover" width={160} height={160} sizes="160px" unoptimized />
        ) : (
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {item.extension}
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <p className="truncate text-sm font-semibold text-gray-900">{item.fileName}</p>
        <div className="flex items-center justify-between text-[11px] uppercase text-muted">
          <span>{item.type}</span>
          {item.dimensions && <span className="tracking-wide">{item.dimensions}</span>}
        </div>
      </div>
    </div>
  );
}
