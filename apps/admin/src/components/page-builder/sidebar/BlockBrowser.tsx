/**
 * Block Browser Component
 * 
 * Panel z listą dostępnych bloków do przeciągania.
 * Features: kategorie, search, drag handles, virtual scrolling ready.
 */

import React, { memo, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  FiSearch,
  FiLayout,
  FiType,
  FiImage,
  FiBox,
  FiGrid,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import type { BlockCategory, BlockDefinition, DragData } from '@/lib/page-builder/types';
import styles from './BlockBrowser.module.css';

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

const CATEGORY_CONFIG: Record<BlockCategory, { label: string; icon: React.ReactNode }> = {
  layout: { label: 'Layout', icon: <FiLayout /> },
  typography: { label: 'Typography', icon: <FiType /> },
  media: { label: 'Media', icon: <FiImage /> },
  components: { label: 'Components', icon: <FiBox /> },
  advanced: { label: 'Advanced', icon: <FiGrid /> },
  internal: { label: 'Internal', icon: <FiBox /> },
};

const VISIBLE_CATEGORIES: BlockCategory[] = ['layout', 'typography', 'media', 'components', 'advanced'];

// =============================================================================
// DRAGGABLE BLOCK ITEM
// =============================================================================

type BlockItemProps = {
  definition: BlockDefinition;
};

const BlockItem: React.FC<BlockItemProps> = memo(({ definition }) => {
  const dragData: DragData = useMemo(() => ({
    dragType: 'new-block',
    blockType: definition.type,
  }), [definition.type]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `palette-${definition.type}`,
    data: dragData,
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`${styles.blockItem} ${isDragging ? styles.isDragging : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className={styles.blockIcon}>
        {definition.icon}
      </div>
      <div className={styles.blockInfo}>
        <span className={styles.blockTitle}>{definition.title}</span>
        {definition.description && (
          <span className={styles.blockDescription}>{definition.description}</span>
        )}
      </div>
    </div>
  );
});

BlockItem.displayName = 'BlockItem';

// =============================================================================
// CATEGORY SECTION
// =============================================================================

type CategorySectionProps = {
  category: BlockCategory;
  blocks: BlockDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
};

const CategorySection: React.FC<CategorySectionProps> = memo(({
  category,
  blocks,
  isExpanded,
  onToggle,
}) => {
  const config = CATEGORY_CONFIG[category];
  
  if (blocks.length === 0) return null;
  
  return (
    <div className={styles.category}>
      <button
        className={styles.categoryHeader}
        onClick={onToggle}
        type="button"
      >
        <div className={styles.categoryIcon}>{config.icon}</div>
        <span className={styles.categoryLabel}>{config.label}</span>
        <span className={styles.categoryCount}>{blocks.length}</span>
        <div className={styles.categoryChevron}>
          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
        </div>
      </button>
      
      {isExpanded && (
        <div className={styles.categoryContent}>
          {blocks.map((block) => (
            <BlockItem key={block.type} definition={block} />
          ))}
        </div>
      )}
    </div>
  );
});

CategorySection.displayName = 'CategorySection';

// =============================================================================
// BLOCK BROWSER
// =============================================================================

export const BlockBrowser: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<BlockCategory>>(
    new Set(VISIBLE_CATEGORIES)
  );
  
  // Get all blocks grouped by category
  const blocksByCategory = useMemo(() => {
    const allBlocks = blockRegistry.getAllBlocks();
    const grouped: Record<BlockCategory, BlockDefinition[]> = {
      layout: [],
      typography: [],
      media: [],
      components: [],
      advanced: [],
      internal: [],
    };
    
    for (const block of allBlocks) {
      // Skip canvas-only and item nodes
      if (block.isCanvasOnly || block.isItemNode) continue;
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = block.title.toLowerCase().includes(query);
        const matchesType = block.type.toLowerCase().includes(query);
        const matchesDescription = block.description?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesType && !matchesDescription) {
          continue;
        }
      }
      
      grouped[block.category].push(block);
    }
    
    return grouped;
  }, [searchQuery]);
  
  // Toggle category
  const toggleCategory = (category: BlockCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  // Count total blocks
  const totalBlocks = useMemo(() => {
    return VISIBLE_CATEGORIES.reduce(
      (sum, cat) => sum + blocksByCategory[cat].length,
      0
    );
  }, [blocksByCategory]);
  
  return (
    <div className={styles.browser}>
      {/* Search */}
      <div className={styles.searchContainer}>
        <FiSearch className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search blocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Block list */}
      <div className={styles.blockList}>
        {totalBlocks === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <p>No blocks found for "{searchQuery}"</p>
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </>
            ) : (
              <p>No blocks available</p>
            )}
          </div>
        ) : (
          VISIBLE_CATEGORIES.map((category) => (
            <CategorySection
              key={category}
              category={category}
              blocks={blocksByCategory[category]}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BlockBrowser;
