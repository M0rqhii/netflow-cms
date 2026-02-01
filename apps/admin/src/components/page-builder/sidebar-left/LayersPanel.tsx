"use client";

/**
 * Layers Panel - tree view of the page structure.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronRight, FiEye, FiEyeOff, FiLock, FiUnlock, FiSearch } from 'react-icons/fi';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import type { BlockNode, PageContent } from '@/lib/page-builder/types';
import { blockRegistry } from '@/lib/page-builder/block-registry';

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
      className={`flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer ${
        isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={() => selectBlock(node.id)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) toggleExpanded(node.id);
        }}
        className="text-gray-400"
      >
        {hasChildren ? (isExpanded ? <FiChevronDown /> : <FiChevronRight />) : <span className="w-3" />}
      </button>
      <span className="flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateBlockMeta(node.id, { hidden: !node.meta?.hidden });
        }}
        className="text-gray-400 hover:text-gray-600"
        title={node.meta?.hidden ? 'Show' : 'Hide'}
      >
        {node.meta?.hidden ? <FiEyeOff /> : <FiEye />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateBlockMeta(node.id, { locked: !node.meta?.locked });
        }}
        className="text-gray-400 hover:text-gray-600"
        title={node.meta?.locked ? 'Unlock' : 'Lock'}
      >
        {node.meta?.locked ? <FiLock /> : <FiUnlock />}
      </button>
    </div>
  );
}

export function LayersPanel() {
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
          <div>
            {node.childIds.map((childId) => renderTree(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Warstwy</h2>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj warstw..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {content.rootId ? renderTree(content.rootId, 0) : null}
      </div>
    </div>
  );
}

export default LayersPanel;
