import React from 'react';
import Image from 'next/image';
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

  const isImage = item.isImage;

  return (
    <div className="flex h-full flex-col space-y-4 p-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={item.url} alt={item.alt || item.fileName} className="h-full w-full object-contain" width={320} height={240} sizes="320px" unoptimized />
        ) : (
          <div className="text-sm text-muted">
            {item.extension.toUpperCase()} preview not available
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">{item.fileName}</h3>
        <p className="text-sm text-muted">
          {item.mimeType} · {item.sizeLabel} {item.dimensions ? `· ${item.dimensions}` : ''} · Uploaded{' '}
          {new Date(item.createdAt).toLocaleString()}
        </p>
        {item.alt && <p className="text-xs text-muted">Alt: {item.alt}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
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

      <div className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-sm text-muted space-y-1">
        <div>Path: {item.path || '—'}</div>
        <div>Extension: {item.extension.toUpperCase()}</div>
      </div>
    </div>
  );
}
