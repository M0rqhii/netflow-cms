"use client";

/**
 * Block Browser - Left Sidebar
 * 
 * Wyświetla dostępne bloki do przeciągnięcia na canvas.
 * Używa blockRegistry do dynamicznego pobierania bloków.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { registerAllBlocks } from '../blocks/registerBlocks';
import type { BlockDefinition } from '@/lib/page-builder/types';
import { FiSearch, FiChevronDown, FiChevronRight } from 'react-icons/fi';

// =============================================================================
// BLOCK ITEM (Draggable)
// =============================================================================

interface BlockItemProps {
  definition: BlockDefinition;
}

function BlockItem({ definition }: BlockItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-block-${definition.type}`,
    data: {
      dragType: 'new-block',
      blockType: definition.type,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md border border-gray-200
        hover:bg-gray-50 hover:border-gray-300 cursor-grab
        transition-all duration-150
        ${isDragging ? 'opacity-50 border-blue-400 bg-blue-50' : ''}
      `}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-gray-600">
        {definition.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {definition.title}
        </div>
        {definition.description && (
          <div className="text-xs text-gray-500 truncate">
            {definition.description}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CATEGORY SECTION
// =============================================================================

interface CategorySectionProps {
  category: string;
  blocks: BlockDefinition[];
  defaultOpen?: boolean;
}

function CategorySection({ category, blocks, defaultOpen = true }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const categoryLabels: Record<string, string> = {
    layout: 'Layout',
    typography: 'Typografia',
    media: 'Media',
    components: 'Komponenty',
    advanced: 'Zaawansowane',
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {categoryLabels[category] || category}
        </span>
        {isOpen ? (
          <FiChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <FiChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {blocks.map((block) => (
            <BlockItem key={block.type} definition={block} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BlockBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  // Register blocks on mount
  useEffect(() => {
    registerAllBlocks();
    setMounted(true);
  }, []);

  // Get browsable blocks (exclude internal like root)
  const browsableBlocks = useMemo(() => {
    if (!mounted) return [];
    return blockRegistry.getBrowsableBlocks();
  }, [mounted]);

  // Group by category
  const blocksByCategory = useMemo(() => {
    const grouped: Record<string, BlockDefinition[]> = {};
    
    for (const block of browsableBlocks) {
      const category = block.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(block);
    }
    
    return grouped;
  }, [browsableBlocks]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return blocksByCategory;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, BlockDefinition[]> = {};
    
    for (const [category, blocks] of Object.entries(blocksByCategory)) {
      const matchingBlocks = blocks.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.type.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query)
      );
      
      if (matchingBlocks.length > 0) {
        filtered[category] = matchingBlocks;
      }
    }
    
    return filtered;
  }, [blocksByCategory, searchQuery]);

  // Category order
  const categoryOrder = ['layout', 'typography', 'media', 'components', 'advanced'];
  const sortedCategories = Object.keys(filteredCategories).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Bloki</h2>
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj bloków..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto">
        {sortedCategories.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {searchQuery ? 'Nie znaleziono bloków' : 'Ładowanie bloków...'}
          </div>
        ) : (
          sortedCategories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              blocks={filteredCategories[category]}
            />
          ))
        )}
      </div>

      {/* Hint */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Przeciągnij blok na canvas
        </p>
      </div>
    </div>
  );
}

export default BlockBrowser;
