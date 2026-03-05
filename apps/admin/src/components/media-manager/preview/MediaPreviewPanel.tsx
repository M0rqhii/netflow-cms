import React from 'react';
import Image from 'next/image';
import { FiFileText } from 'react-icons/fi';
import { Button, EmptyState } from '@repo/ui';
import { MediaItem } from '../types';

interface MediaPreviewPanelProps {
  item?: MediaItem;
  onDelete?: () => void;
}

export function MediaPreviewPanel({ item, onDelete }: MediaPreviewPanelProps) {
  if (!item) {
    return (
      <div className="h-full">
        <EmptyState title="No file selected" description="Choose a media item to see its details." />
      </div>
    );
  }

  const isImage = item.type === 'image';
  const isVideo = item.type === 'video';
  const isDocument = item.type === 'document' || item.type === 'other';

  return (
    <div className="flex h-full flex-col space-y-4 p-5">
      <div className="aspect-video w-full overflow-hidden rounded-[18px] border border-border bg-surface-2 flex items-center justify-center min-h-[180px]">
        {isImage ? (
          <Image
            src={item.url}
            alt={item.alt || item.fileName}
            className="h-full w-full object-contain"
            width={320}
            height={240}
            sizes="320px"
            unoptimized
          />
        ) : isVideo ? (
          <video
            src={item.url}
            controls
            className="max-h-full w-full object-contain"
            preload="metadata"
          />
        ) : isDocument ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <FiFileText className="w-14 h-14 text-muted" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{item.extension}</span>
            <Button variant="outline" size="sm" onClick={() => window.open(item.url, '_blank')}>
              Open file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted">
            <FiFileText className="w-10 h-10" />
            <span>{item.extension} — preview not available</span>
            <Button variant="outline" size="sm" onClick={() => window.open(item.url, '_blank')}>
              Open
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text truncate" title={item.fileName}>
          {item.fileName}
        </h3>
        <p className="text-sm text-muted">
          {item.mimeType} · {item.sizeLabel}
          {item.dimensions ? ` · ${item.dimensions}` : ''} · Uploaded {new Date(item.createdAt).toLocaleString()}
        </p>
        {item.alt && <p className="text-xs text-muted">Alt: {item.alt}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" size="sm" onClick={() => window.open(item.url, '_blank')}>
          Open
        </Button>
        <Button variant="outline" size="sm" disabled>
          Replace
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>

      <div className="rounded-[14px] border border-dashed border-border bg-surface-2 p-3 text-sm text-muted space-y-1">
        <div>Path: {item.path || '—'}</div>
        <div>Extension: {item.extension.toUpperCase()}</div>
      </div>
    </div>
  );
}




