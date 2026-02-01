"use client";

/**
 * Block Browser - Left Sidebar
 *
 * Wyświetla dostępne bloki do przeciągnięcia na canvas.
 * Używa blockRegistry do dynamicznego pobierania bloków.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { registerAllBlocks } from '../blocks/registerBlocks';
import type { BlockDefinition } from '@/lib/page-builder/types';
import { useSiteId } from '../PageBuilderContext';
import { useSiteFeatures } from '@/lib/site-features';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { getBuilderModuleDependencies, getModuleDisplayTitle, isBuilderModuleKey } from '@/lib/page-builder/modules';
import { FiSearch, FiChevronDown, FiChevronRight, FiLock } from 'react-icons/fi';

// =============================================================================
// SEARCH HELPERS
// =============================================================================

const SEARCH_SYNONYMS: Record<string, string[]> = {
  slider: ['carousel'],
  carousel: ['slider'],
  opinie: ['testimonial', 'testimonials'],
  testimonial: ['opinie'],
  testimonials: ['opinie'],
  cennik: ['pricing'],
  pricing: ['cennik'],
  popup: ['modal'],
  modal: ['popup'],
  koszyk: ['cart'],
  cart: ['koszyk'],
  platnosc: ['checkout', 'stripe'],
  payment: ['checkout', 'stripe'],
  checkout: ['payment'],
};

const normalizeQueryTerms = (query: string) => {
  const raw = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const expanded = new Set(raw);
  raw.forEach((term) => {
    (SEARCH_SYNONYMS[term] || []).forEach((alt) => expanded.add(alt));
  });

  return Array.from(expanded);
};

// =============================================================================
// BLOCK ITEM (Draggable)
// =============================================================================

interface BlockItemProps {
  definition: BlockDefinition;
  locked?: boolean;
  lockedReason?: string;
  onEnable?: () => void;
}

function BlockItem({ definition, locked, lockedReason, onEnable }: BlockItemProps) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-block-${definition.type}`,
    data: {
      dragType: 'new-block',
      blockType: definition.type,
    },
    disabled: Boolean(locked),
  });

  return (
    <div
      ref={setNodeRef}
      {...(!locked ? listeners : {})}
      {...(!locked ? attributes : {})}
      className={`
        group relative flex items-center gap-3 px-3 py-2 rounded-md border border-gray-200
        hover:bg-gray-50 hover:border-gray-300 transition-all duration-150
        ${locked ? 'cursor-not-allowed bg-gray-50 opacity-75' : 'cursor-grab'}
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

      {locked && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FiLock className="w-3 h-3" />
          {lockedReason ? <span className="hidden sm:inline">{lockedReason}</span> : null}
        </div>
      )}

      {locked && onEnable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEnable();
          }}
          className="ml-auto rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          {t('builderBlocks.enable')}
        </button>
      )}
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
  renderItem: (block: BlockDefinition) => React.ReactNode;
}

function CategorySection({ category, blocks, defaultOpen = true, renderItem }: CategorySectionProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const categoryLabels: Record<string, string> = {
    layout: t('builderBlocks.categoryLayout'),
    typography: t('builderBlocks.categoryTypography'),
    media: t('builderBlocks.categoryMedia'),
    components: t('builderBlocks.categoryComponents'),
    advanced: t('builderBlocks.categoryAdvanced'),
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
          {blocks.map((block) => renderItem(block))}
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
  const toast = useToast();
  const t = useTranslations();

  const siteId = useSiteId();
  const { features, updateOverride, isEnabled, isInPlan } = useSiteFeatures(siteId);

  // Register blocks on mount
  useEffect(() => {
    registerAllBlocks();
    setMounted(true);
  }, []);

  const handleEnableModule = useCallback(
    async (moduleKey?: string) => {
      if (!moduleKey || !isBuilderModuleKey(moduleKey)) return;
      try {
        const deps = getBuilderModuleDependencies(moduleKey);
        const missingDeps = deps.filter((dep) => !isEnabled(dep));

        if (missingDeps.length > 0) {
          const depLabels = missingDeps.map((dep) => getModuleDisplayTitle(dep)).join(', ');
          const confirmed = window.confirm(
            `${t('builderBlocks.moduleRequires')}: ${depLabels}. ${t('builderBlocks.moduleConfirm')}`
          );
          if (!confirmed) return;

          for (const dep of missingDeps) {
            await updateOverride(dep, true);
          }
        }

        await updateOverride(moduleKey, true);
        toast.push({ tone: 'success', message: `${t('builderBlocks.moduleEnabled')}: ${getModuleDisplayTitle(moduleKey)}` });
      } catch (err) {
        const message = err instanceof Error ? err.message : t('builderBlocks.moduleEnableFailed');
        toast.push({ tone: 'error', message });
      }
    },
    [isEnabled, t, toast, updateOverride]
  );

  // Get browsable blocks (exclude internal like root)
  const browsableBlocks = useMemo(() => {
    if (!mounted) return [];
    return blockRegistry.getBrowsableBlocks();
  }, [mounted]);

  const searchTerms = useMemo(() => normalizeQueryTerms(searchQuery), [searchQuery]);

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

    const filtered: Record<string, BlockDefinition[]> = {};

    for (const [category, blocks] of Object.entries(blocksByCategory)) {
      const matchingBlocks = blocks.filter((b) => {
        const haystack = [
          b.title,
          b.type,
          b.description || '',
          ...(b.tags || []),
          ...(b.keywords || []),
        ]
          .join(' ')
          .toLowerCase();

        return searchTerms.some((term) => haystack.includes(term));
      });

      if (matchingBlocks.length > 0) {
        filtered[category] = matchingBlocks;
      }
    }

    return filtered;
  }, [blocksByCategory, searchQuery, searchTerms]);

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
        <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('builderBlocks.title')}</h2>

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
              renderItem={(block) => {
                const moduleKey = block.moduleKey;
                const gatingReady = Boolean(features);
                const enabled = !moduleKey || (gatingReady && isEnabled(moduleKey));
                const inPlan = !moduleKey || (gatingReady && isInPlan(moduleKey));
                const locked = Boolean(moduleKey) && (!gatingReady || !enabled);
                const lockedReason = !gatingReady
                  ? t('builderBlocks.checkingPlan')
                  : !inPlan
                  ? t('builderBlocks.requiresPlan')
                  : 'Moduł wyłączony';

                return (
                  <BlockItem
                    key={block.type}
                    definition={block}
                    locked={locked}
                    lockedReason={locked ? lockedReason : undefined}
                    onEnable={locked && gatingReady && inPlan ? () => handleEnableModule(moduleKey) : undefined}
                  />
                );
              }}
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
