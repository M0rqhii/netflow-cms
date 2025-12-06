"use client";

import React, { useMemo, useState } from 'react';
import { Card } from '@repo/ui';
import { MediaGrid } from './grid/MediaGrid';
import { MediaSidebar } from './sidebar/MediaSidebar';
import { MediaPreviewPanel } from './preview/MediaPreviewPanel';
import { MediaToolbar } from './toolbar/MediaToolbar';
import { MediaFilter, MediaItem } from './types';

const MOCK_MEDIA_ITEMS: MediaItem[] = [
  { id: '1', name: 'hero-banner.png', type: 'image', extension: 'PNG', dimensions: '1920x1080', size: '2.1 MB', thumbnailTone: 'cool' },
  { id: '2', name: 'team-photo.jpg', type: 'image', extension: 'JPG', dimensions: '1200x800', size: '1.1 MB', thumbnailTone: 'warm' },
  { id: '3', name: 'product-demo.mp4', type: 'video', extension: 'MP4', dimensions: '1920x1080', size: '18.4 MB', thumbnailTone: 'cool' },
  { id: '4', name: 'pricing-guide.pdf', type: 'document', extension: 'PDF', dimensions: 'A4', size: '850 KB', thumbnailTone: 'neutral' },
  { id: '5', name: 'logo-symbol.svg', type: 'image', extension: 'SVG', dimensions: 'Responsive', size: '24 KB', thumbnailTone: 'neutral' },
  { id: '6', name: 'intro-loop.mov', type: 'video', extension: 'MOV', dimensions: '1080x1080', size: '42 MB', thumbnailTone: 'warm' },
  { id: '7', name: 'case-study.docx', type: 'document', extension: 'DOCX', dimensions: 'Letter', size: '620 KB', thumbnailTone: 'cool' },
  { id: '8', name: 'newsletter-header.png', type: 'image', extension: 'PNG', dimensions: '1600x900', size: '1.8 MB', thumbnailTone: 'warm' },
];

function matchesFilter(item: MediaItem, filter: MediaFilter) {
  if (filter === 'all') return true;
  if (filter === 'images') return item.type === 'image';
  if (filter === 'videos') return item.type === 'video';
  if (filter === 'documents') return item.type === 'document';
  return false;
}

export function MediaManager() {
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return MOCK_MEDIA_ITEMS.filter((item) => {
      const matchesCategory = matchesFilter(item, activeFilter);
      const matchesSearch = term === '' || item.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const selectedItemId = filteredItems[0]?.id;
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <Card className="p-0">
        <MediaSidebar activeFilter={activeFilter} onFilterSelect={setActiveFilter} />
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <MediaToolbar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </Card>

        <MediaGrid items={filteredItems} selectedId={selectedItemId} />
      </div>

      <Card className="p-0">
        <MediaPreviewPanel item={selectedItem} />
      </Card>
    </div>
  );
}
