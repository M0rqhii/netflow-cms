import React from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { FiPlay, FiFileText } from 'react-icons/fi';
import { MediaItem } from '../types';

interface MediaGridItemProps {
  item: MediaItem;
  selected?: boolean;
}

export function MediaGridItem({ item, selected }: MediaGridItemProps) {
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';

  return (
    <div
      className={clsx(
        'rounded-[18px] border border-border bg-surface p-3 shadow-soft transition-all cursor-pointer',
        selected
          ? 'border-[rgba(0,163,255,0.35)] bg-[rgba(0,163,255,0.12)] ring-1 ring-[rgba(0,163,255,0.35)]'
          : 'border-border hover:bg-[var(--hover)] hover:shadow'
      )}
    >
      <div className="aspect-square w-full overflow-hidden rounded-[14px] border border-border bg-surface-2 flex items-center justify-center relative">
        {isImage ? (
          <Image
            src={item.url}
            alt={item.fileName}
            className="h-full w-full object-cover"
            width={160}
            height={160}
            sizes="160px"
            unoptimized
          />
        ) : isVideo ? (
          <>
            <video
              src={item.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
              aria-hidden
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <FiPlay className="w-8 h-8 text-white drop-shadow" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 p-2">
            <FiFileText className="w-8 h-8 text-muted" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.extension}</span>
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <p className="truncate text-sm font-semibold text-text">{item.fileName}</p>
        <div className="flex items-center justify-between text-[11px] uppercase text-muted">
          <span>{item.type}</span>
          {item.dimensions && <span className="tracking-wide">{item.dimensions}</span>}
        </div>
      </div>
    </div>
  );
}




