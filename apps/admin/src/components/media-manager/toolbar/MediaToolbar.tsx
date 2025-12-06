import React from 'react';
import { Button, Input } from '@repo/ui';
import { MediaFilter } from '../types';

interface MediaToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: MediaFilter;
  onFilterChange: (filter: MediaFilter) => void;
}

const FILTERS: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'documents', label: 'Documents' },
];

export function MediaToolbar({ searchQuery, onSearchChange, activeFilter, onFilterChange }: MediaToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Search files"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Button variant="outline" disabled>
          Upload
        </Button>
        <Button variant="outline" disabled>
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <Button
              key={filter.id}
              variant={isActive ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
