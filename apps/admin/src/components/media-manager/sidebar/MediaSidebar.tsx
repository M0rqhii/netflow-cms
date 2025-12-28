import React from 'react';
import { clsx } from 'clsx';
import { MediaFilter } from '../types';

interface MediaSidebarProps {
  activeFilter: MediaFilter;
  onFilterSelect: (filter: MediaFilter) => void;
}

const SECTIONS: { id: MediaFilter; label: string; hint?: string }[] = [
  { id: 'all', label: 'All Media' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'documents', label: 'Documents' },
];

export function MediaSidebar({ activeFilter, onFilterSelect }: MediaSidebarProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Library</h3>
        <p className="text-xs text-muted">Browse available folders</p>
      </div>

      <div className="space-y-1">
        {SECTIONS.map((section) => {
          const isActive = section.id === activeFilter;

          return (
            <button
              key={section.id}
              type="button"
              className={clsx(
                'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200',
              )}
              onClick={() => onFilterSelect(section.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{section.label}</span>
                {section.hint && <span className="text-[10px] uppercase tracking-wide text-muted">{section.hint}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border border-dashed border-gray-200 p-3 text-xs text-muted">
        Folder system placeholder. Drag-and-drop and custom folders will live here in the future.
      </div>
    </div>
  );
}
