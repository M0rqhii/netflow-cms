"use client";

/**
 * Block Browser - Left Sidebar
 *
 * Displays available blocks to drag onto the canvas.
 * Uses blockRegistry to load blocks dynamically.
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

const SEARCH_SYNONYMS: Record<string, string[]> = {
  slider: ['carousel'],
  carousel: ['slider'],
  opinie: ['testimonial', 'testimonials'],
  testimonial: ['opinie'],
  testimonials: ['opinie'],
  cennik: ['pricing'],
  pricing: ['cennik'],
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

const humanizeBlockType = (type: string) =>
  type
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();

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

  const subtitle = definition.description?.trim() || humanizeBlockType(definition.type);

  return (
    <div>
      <div
        ref={setNodeRef}
        {...(!locked ? listeners : {})}
        {...(!locked ? attributes : {})}
        className={`tile ${locked ? 'opacity-70 cursor-not-allowed' : 'cursor-grab'} ${
          isDragging ? 'opacity-60' : ''
        }`}
      >
        <div>
          <strong>{definition.title}</strong>
          <br />
          <small>{subtitle}</small>
        </div>
        <span className="pill" aria-hidden="true" style={{ width: 32, height: 32 }}>
          {definition.icon}
        </span>
      </div>

      {locked && (
        <div className="flex items-center gap-2 text-xs text-muted mt-2">
          <FiLock className="w-3 h-3" />
          {lockedReason ? <span>{lockedReason}</span> : null}
        </div>
      )}

      {locked && onEnable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEnable();
          }}
          className="btn"
          style={{ marginTop: 8 }}
        >
          {t('builderBlocks.enable')}
        </button>
      )}
    </div>
  );
}

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
    <div className="builder-category-section">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn"
        style={{ width: '100%', justifyContent: 'space-between' }}
        type="button"
      >
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {categoryLabels[category] || category}
        </span>
        {isOpen ? <FiChevronDown /> : <FiChevronRight />}
      </button>

      {isOpen && <div className="builder-category-blocks">{blocks.map((block) => renderItem(block))}</div>}
    </div>
  );
}

export function BlockBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const t = useTranslations();

  const siteId = useSiteId();
  const { features, updateOverride, isEnabled, isInPlan } = useSiteFeatures(siteId);

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

  const browsableBlocks = useMemo(() => {
    if (!mounted) return [];
    return blockRegistry.getBrowsableBlocks();
  }, [mounted]);

  const searchTerms = useMemo(() => normalizeQueryTerms(searchQuery), [searchQuery]);

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

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return blocksByCategory;
    }

    const filtered: Record<string, BlockDefinition[]> = {};

    for (const [category, blocks] of Object.entries(blocksByCategory)) {
      const matchingBlocks = blocks.filter((b) => {
        const haystack = [b.title, b.type, b.description || '', ...(b.tags || []), ...(b.keywords || [])]
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
    <div className="builder-block-browser">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder={t('builderBlocks.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ paddingLeft: 32 }}
        />
      </div>

      {sortedCategories.length === 0 ? (
        <div className="card" style={{ padding: 12, borderRadius: 16, color: 'var(--muted)' }}>
          {searchQuery ? t('builderBlocks.emptySearch') : t('builderBlocks.loading')}
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
                : t('builderBlocks.moduleDisabled');

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

      <div className="card" style={{ padding: 12, borderRadius: 16, color: 'var(--muted)' }}>
        {t('builderBlocks.dragHint')}
      </div>
    </div>
  );
}

export default BlockBrowser;
