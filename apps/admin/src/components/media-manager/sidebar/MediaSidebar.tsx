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
    <div className="p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-text">Library</h3>
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
                'w-full rounded-[14px] border px-3 py-2.5 text-left text-sm transition-colors',
                isActive ? 'border-[rgba(0,163,255,0.35)] bg-[rgba(0,163,255,0.12)] text-primary' : 'border-border bg-surface-2 hover:bg-[var(--hover)]',
              )}
              onClick={() => onFilterSelect(section.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{section.label}</span>
                {section.hint && <span className="text-xs uppercase tracking-wide text-muted">{section.hint}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-dashed border-border bg-surface-2 p-3 text-xs text-muted">
        Folder system placeholder. Drag-and-drop and custom folders will live here in the future.
      </div>
    </div>
  );
}



