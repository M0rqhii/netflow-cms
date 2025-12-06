import React from 'react';
import { Button } from '@repo/ui';
import { MediaItem } from '../types';

interface MediaPreviewPanelProps {
  item?: MediaItem;
}

export function MediaPreviewPanel({ item }: MediaPreviewPanelProps) {
  return (
    <div className="flex h-full flex-col space-y-4 p-4">
      <div className="aspect-video w-full rounded-lg border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-sm text-muted">
        Placeholder preview
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900">{item?.name ?? 'Select a file'}</h3>
        <p className="text-sm text-muted">
          Type: {item?.type ?? 'image'} | Format: {item?.extension ?? 'PNG'} | Dimensions: {item?.dimensions ?? '1920x1080'}
        </p>
        <p className="text-xs text-muted">Static preview only. Actions are disabled until storage is connected.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" disabled>
          Open
        </Button>
        <Button variant="outline" size="sm" disabled>
          Replace
        </Button>
        <Button variant="outline" size="sm" disabled>
          Delete
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-sm text-muted">
        File metadata placeholder. Once wired to backend, details like file size, upload date, and usage references will show here.
      </div>
    </div>
  );
}
