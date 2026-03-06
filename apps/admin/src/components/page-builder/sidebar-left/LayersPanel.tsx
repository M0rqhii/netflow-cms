"use client";

/**
 * Layers Panel - tree view of the page structure.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronRight, FiEye, FiEyeOff, FiLock, FiUnlock, FiSearch } from 'react-icons/fi';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import type { BlockNode, PageContent } from '@/lib/page-builder/types';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { useTranslations } from '@/hooks/useTranslations';

function buildVisibleTree(content: PageContent, search: string) {
  if (!search.trim()) return new Set(Object.keys(content.nodes));
  const query = search.toLowerCase();
  const visible = new Set<string>();

  const matchesNode = (node: BlockNode) => {
    const def = blockRegistry.getBlock(node.type);
    const label = node.meta?.label || def?.title || node.type;
    return label.toLowerCase().includes(query) || node.type.toLowerCase().includes(query);
  };

  const visit = (nodeId: string): boolean => {
    const node = content.nodes[nodeId];
    if (!node) return false;
    const childMatches = node.childIds.some((childId) => visit(childId));
    const selfMatch = matchesNode(node);
    if (selfMatch || childMatches) {
      visible.add(nodeId);
      return true;
    }
    return false;
  };

  visit(content.rootId);
  return visible;
}

function LayerRow({
  node,
  depth,
  isExpanded,
  toggleExpanded,
  isVisible,
}: {
  node: BlockNode;
  depth: number;
  isExpanded: boolean;
  toggleExpanded: (id: string) => void;
  isVisible: boolean;
}) {
  const t = useTranslations();
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  const selectedBlockId = usePageBuilderStore((s) => s.selectedBlockId);
  const updateBlockMeta = usePageBuilderStore((s) => s.updateBlockMeta);

  if (!isVisible) return null;

  const hasChildren = node.childIds.length > 0;
  const definition = blockRegistry.getBlock(node.type);
  const label = node.meta?.label || definition?.title || node.type;
  const isSelected = selectedBlockId === node.id;

  return (
    <div
      className={`builder-layer-row ${isSelected ? 'is-selected' : ''}`}
      style={{ paddingLeft: 10 + depth * 14 }}
      onClick={() => selectBlock(node.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectBlock(node.id);
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) toggleExpanded(node.id);
        }}
        className="builder-layer-icon"
        aria-label={
          hasChildren
            ? isExpanded
              ? t('sitePanelShell.pageBuilderUi.layersPanel.collapse')
              : t('sitePanelShell.pageBuilderUi.layersPanel.expand')
            : t('sitePanelShell.pageBuilderUi.layersPanel.noChildren')
        }
      >
        {hasChildren ? (isExpanded ? <FiChevronDown /> : <FiChevronRight />) : <span className="w-3" />}
      </button>

      <span className="builder-layer-label">{label}</span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateBlockMeta(node.id, { hidden: !node.meta?.hidden });
        }}
        className="builder-layer-icon"
        title={node.meta?.hidden ? t('sitePanelShell.pageBuilderUi.layersPanel.show') : t('sitePanelShell.pageBuilderUi.layersPanel.hide')}
        aria-label={
          node.meta?.hidden
            ? t('sitePanelShell.pageBuilderUi.layersPanel.showLayer')
            : t('sitePanelShell.pageBuilderUi.layersPanel.hideLayer')
        }
      >
        {node.meta?.hidden ? <FiEyeOff /> : <FiEye />}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateBlockMeta(node.id, { locked: !node.meta?.locked });
        }}
        className="builder-layer-icon"
        title={node.meta?.locked ? t('sitePanelShell.pageBuilderUi.layersPanel.unlock') : t('sitePanelShell.pageBuilderUi.layersPanel.lock')}
        aria-label={
          node.meta?.locked
            ? t('sitePanelShell.pageBuilderUi.layersPanel.unlockLayer')
            : t('sitePanelShell.pageBuilderUi.layersPanel.lockLayer')
        }
      >
        {node.meta?.locked ? <FiLock /> : <FiUnlock />}
      </button>
    </div>
  );
}

export function LayersPanel() {
  const t = useTranslations();
  const content = usePageBuilderStore((s) => s.content);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const visibleSet = useMemo(() => buildVisibleTree(content, search), [content, search]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  }, []);

  const renderTree = (nodeId: string, depth: number) => {
    const node = content.nodes[nodeId];
    if (!node) return null;

    const isExpanded = expanded[nodeId] ?? true;
    const isVisible = visibleSet.has(nodeId);

    return (
      <div key={nodeId}>
        <LayerRow
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          toggleExpanded={toggleExpanded}
          isVisible={isVisible}
        />
        {node.childIds.length > 0 && isExpanded && (
          <div>{node.childIds.map((childId) => renderTree(childId, depth + 1))}</div>
        )}
      </div>
    );
  };

  const rootChildren = content.nodes[content.rootId]?.childIds || [];

  return (
    <div className="builder-layers-panel">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder={t('sitePanelShell.pageBuilderUi.layersPanel.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: 32 }}
        />
      </div>

      <div className="builder-layers-scroll">
        {rootChildren.length === 0 ? (
          <div className="card" style={{ padding: 12, borderRadius: 16, color: 'var(--muted)' }}>
            {t('sitePanelShell.pageBuilderUi.layersPanel.empty')}
          </div>
        ) : (
          rootChildren.map((childId) => renderTree(childId, 0))
        )}
      </div>
    </div>
  );
}

export default LayersPanel;
