/**
 * Block Renderer Component
 *
 * Dynamically renders a block based on type.
 * Handles unknown blocks gracefully.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  FiPlus,
  FiMove,
  FiSettings,
  FiCopy,
  FiPower,
  FiTrash2,
  FiMoreVertical,
  FiChevronUp,
} from 'react-icons/fi';
import { useBlockNode, useIsBlockSelected, usePageBuilderStore } from '@/stores/page-builder-store';
import { useEnabledModules } from '../PageBuilderContext';
import { blockRegistry, canAddChild } from '@/lib/page-builder/block-registry';
import { BlockWrapper } from './BlockWrapper';
import { UnknownBlock } from './UnknownBlock';

/** Usunięte z katalogu – render jak container */
const LEGACY_LAYOUT_TYPES = new Set(['grid', 'columns', 'flex-row', 'flex-column', 'stack', 'wrap', 'before-after-slider']);
/** Zastąpione jednym blokiem Video */
const LEGACY_VIDEO_TYPES = new Set(['video-embed', 'video-file']);
/** Zastąpione jednym blokiem Gallery */
const LEGACY_GALLERY_TYPES = new Set(['gallery-grid', 'masonry-gallery']);
/** Zastąpione jednym blokiem Carousel */
const LEGACY_CAROUSEL_TYPES = new Set(['carousel-images', 'carousel-content']);
/** Zastąpione blokiem Spacer/Divider */
const LEGACY_SPACER_DIVIDER_TYPES = new Set(['spacer', 'divider', 'shape-divider']);
/** Zastąpione jednym blokiem Embed */
const LEGACY_EMBED_TYPES = new Set(['html-embed', 'iframe-embed']);
/** Usunięty – render jak Button */
const LEGACY_BUTTON_TYPES = new Set(['back-to-top']);
/** Duplikat Anchor (Layout) – render jak anchor */
const LEGACY_ANCHOR_TYPES = new Set(['html-anchor-link']);
import { ModuleDisabledBlock } from './ModuleDisabledBlock';
import type { DragDataExistingNode } from '@/lib/page-builder/dnd-utils';
import styles from './BlockRenderer.module.css';

type BlockRendererProps = {
  nodeId: string;
  isPreview?: boolean;
  isStructure?: boolean;
  depth?: number;
};

type QuickAddCandidate = {
  type: string;
  label: string;
};

const QUICK_ADD_CANDIDATES: QuickAddCandidate[] = [
  { type: 'section', label: 'Section' },
  { type: 'column', label: 'Column' },
  { type: 'container', label: 'Layout' },
  { type: 'heading', label: 'Heading' },
  { type: 'text', label: 'Text' },
  { type: 'button', label: 'Button' },
];

const STRUCTURE_COLORS = ['#2f8dde', '#ff9c33', '#2ec6b6', '#4b5b70'];

const getStructureColor = (depth: number, type: string) => {
  if (type === 'section') return STRUCTURE_COLORS[depth % 2];
  if (type.includes('row') || type.includes('grid') || type.includes('column')) return '#2ec6b6';
  return STRUCTURE_COLORS[3];
};

const getQuickAddTarget = (parentType?: string): QuickAddCandidate | null => {
  if (!parentType) return null;
  for (const candidate of QUICK_ADD_CANDIDATES) {
    if (canAddChild(parentType, candidate.type)) {
      return candidate;
    }
  }
  return null;
};

type StructureActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

const StructureActionButton: React.FC<StructureActionButtonProps> = ({ children, onClick, ...rest }) => {
  return (
    <button
      type="button"
      className={styles.structureActionBtn}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

export const BlockRenderer: React.FC<BlockRendererProps> = memo(({ nodeId, isPreview = false, isStructure = false, depth = 0 }) => {
  const node = useBlockNode(nodeId);
  const isSelected = useIsBlockSelected(nodeId);
  const selectBlock = usePageBuilderStore((state) => state.selectBlock);
  const openPropertiesPanel = usePageBuilderStore((state) => state.openPropertiesPanel);
  const addBlock = usePageBuilderStore((state) => state.addBlock);
  const copyBlock = usePageBuilderStore((state) => state.copyBlock);
  const pasteBlock = usePageBuilderStore((state) => state.pasteBlock);
  const updateBlockMeta = usePageBuilderStore((state) => state.updateBlockMeta);
  const deleteBlock = usePageBuilderStore((state) => state.deleteBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const enabledModules = useEnabledModules();
  const parentNode = usePageBuilderStore((state) => (node?.parentId ? state.content.nodes[node.parentId] : null));

  const definition = useMemo(() => {
    if (!node) return null;
    const def = blockRegistry.getBlock(node.type);
    if (def) return def;
    if (LEGACY_LAYOUT_TYPES.has(node.type)) return blockRegistry.getBlock('container') ?? null;
    if (LEGACY_VIDEO_TYPES.has(node.type)) return blockRegistry.getBlock('video') ?? null;
    if (LEGACY_GALLERY_TYPES.has(node.type)) return blockRegistry.getBlock('gallery') ?? null;
    if (LEGACY_CAROUSEL_TYPES.has(node.type)) return blockRegistry.getBlock('carousel') ?? null;
    if (LEGACY_SPACER_DIVIDER_TYPES.has(node.type)) return blockRegistry.getBlock('spacer-divider') ?? null;
    if (LEGACY_EMBED_TYPES.has(node.type)) return blockRegistry.getBlock('embed') ?? null;
    if (LEGACY_BUTTON_TYPES.has(node.type)) return blockRegistry.getBlock('button') ?? null;
    if (LEGACY_ANCHOR_TYPES.has(node.type)) return blockRegistry.getBlock('anchor') ?? null;
    return null;
  }, [node]);

  const moduleKey = definition?.moduleKey;
  const moduleDisabled = Boolean(moduleKey && !enabledModules.includes(moduleKey));

  const dragData: DragDataExistingNode = useMemo(
    () => ({
      dragType: 'existing-node',
      nodeId,
      nodeType: node?.type || 'unknown',
    }),
    [nodeId, node?.type]
  );

  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: nodeId,
    data: dragData,
    disabled: isPreview || node?.meta?.locked || moduleDisabled,
  });

  const canHaveChildren = definition?.canHaveChildren && !moduleDisabled ? true : false;
  const quickAddTarget = getQuickAddTarget(node?.type);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${nodeId}`,
    data: {
      isDropZone: true,
      parentId: nodeId,
    },
    disabled: !canHaveChildren || isPreview,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPreview) {
      selectBlock(nodeId);
    }
  };

  const handleQuickAdd = useCallback(() => {
    if (!quickAddTarget) return;
    const newId = addBlock(nodeId, quickAddTarget.type);
    if (newId) {
      commit('add');
      selectBlock(newId);
    }
  }, [quickAddTarget, addBlock, nodeId, commit, selectBlock]);

  const handleStructureSettings = useCallback(() => {
    selectBlock(nodeId);
    openPropertiesPanel();
  }, [nodeId, openPropertiesPanel, selectBlock]);

  const handleStructureDuplicate = useCallback(() => {
    if (!node?.parentId || !parentNode) return;
    copyBlock(nodeId);
    const currentIndex = parentNode.childIds.indexOf(nodeId);
    const insertIndex = currentIndex >= 0 ? currentIndex + 1 : undefined;
    pasteBlock(node.parentId, insertIndex);
    commit('paste');
  }, [nodeId, node?.parentId, parentNode, copyBlock, pasteBlock, commit]);

  const handleStructureToggleVisible = useCallback(() => {
    updateBlockMeta(nodeId, { hidden: !node?.meta?.hidden });
    commit('apply');
  }, [nodeId, node?.meta?.hidden, updateBlockMeta, commit]);

  const handleStructureDelete = useCallback(() => {
    if (!node?.parentId || node.meta?.locked) return;
    deleteBlock(nodeId);
    commit('delete');
  }, [nodeId, node?.parentId, node?.meta?.locked, deleteBlock, commit]);

  if (!node) {
    console.warn(`[BlockRenderer] Node "${nodeId}" not found`);
    return null;
  }

  if (!definition) {
    return (
      <BlockWrapper
        nodeId={nodeId}
        isSelected={isSelected}
        isPreview={isPreview}
        isStructure={isStructure}
        isDragging={isDragging}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
        setDragRef={setDragRef}
        onClick={handleClick}
      >
        <UnknownBlock node={node} />
      </BlockWrapper>
    );
  }

  if (definition && moduleDisabled) {
    return (
      <BlockWrapper
        nodeId={nodeId}
        isSelected={isSelected}
        isPreview={isPreview}
        isStructure={isStructure}
        isDragging={isDragging}
        isLocked
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
        setDragRef={setDragRef}
        onClick={handleClick}
      >
        <ModuleDisabledBlock moduleKey={moduleKey!} blockLabel={definition.title} />
      </BlockWrapper>
    );
  }

  if (isStructure) {
    const accent = getStructureColor(depth, node.type);

    return (
      <BlockWrapper
        nodeId={nodeId}
        isSelected={isSelected}
        isPreview={isPreview}
        isStructure={isStructure}
        isDragging={isDragging}
        isLocked={node.meta?.locked}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
        setDragRef={setDragRef}
        onClick={handleClick}
      >
        <div className={styles.structureNode}>
          <div className={styles.structureToolbar} style={{ backgroundColor: accent }}>
            <div className={styles.structureActions}>
              <StructureActionButton
                title="Drag block"
                aria-label="Drag block"
                disabled={Boolean(node.meta?.locked)}
                {...dragListeners}
              >
                <FiMove />
              </StructureActionButton>
              <StructureActionButton title="Block settings" aria-label="Block settings" onClick={handleStructureSettings}>
                <FiSettings />
              </StructureActionButton>
              <StructureActionButton title="Duplicate block" aria-label="Duplicate block" onClick={handleStructureDuplicate}>
                <FiCopy />
              </StructureActionButton>
              <StructureActionButton
                title={node.meta?.hidden ? 'Show block' : 'Hide block'}
                aria-label={node.meta?.hidden ? 'Show block' : 'Hide block'}
                onClick={handleStructureToggleVisible}
              >
                <FiPower />
              </StructureActionButton>
              <StructureActionButton
                title="Delete block"
                aria-label="Delete block"
                onClick={handleStructureDelete}
                disabled={Boolean(node.meta?.locked) || !node.parentId}
              >
                <FiTrash2 />
              </StructureActionButton>
              <StructureActionButton title="Select block" aria-label="Select block" onClick={handleStructureSettings}>
                <FiMoreVertical />
              </StructureActionButton>
            </div>
            <div className={styles.structureName}>{node.meta?.label || definition.title || node.type}</div>
            <div className={styles.structureChevron}><FiChevronUp /></div>
          </div>

          {canHaveChildren ? (
            <div ref={setDropRef} className={styles.structureChildren} data-drop-target={isOver}>
              {node.childIds.map((childId) => (
                <BlockRenderer key={childId} nodeId={childId} isPreview={isPreview} isStructure={isStructure} depth={depth + 1} />
              ))}

              {node.childIds.length === 0 && !isPreview && (
                <div className={styles.structureEmpty}><FiPlus />Drop blocks here</div>
              )}

              <button
                type="button"
                className={styles.structureAddDot}
                onClick={handleQuickAdd}
                disabled={!quickAddTarget}
                title={quickAddTarget ? `Add ${quickAddTarget.label}` : 'No compatible block'}
              >
                <FiPlus />
              </button>
            </div>
          ) : (
            <div className={styles.structureLeaf}>Leaf block</div>
          )}
        </div>
      </BlockWrapper>
    );
  }

  const BlockComponent = definition.component;

  const children = canHaveChildren ? (
    <div ref={setDropRef} className={styles.childrenContainer} data-drop-target={isOver}>
      {node.childIds.map((childId) => (
        <BlockRenderer key={childId} nodeId={childId} isPreview={isPreview} isStructure={isStructure} />
      ))}
      {node.childIds.length === 0 && !isPreview && (
        <div className={styles.emptyPlaceholder}>
          <span className={styles.emptyPlaceholderHint}><FiPlus />Drop blocks here</span>
          {quickAddTarget && (
            <button type="button" className={styles.quickAddButton} onClick={handleQuickAdd}>
              Add {quickAddTarget.label}
            </button>
          )}
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <BlockWrapper
      nodeId={nodeId}
      isSelected={isSelected}
      isPreview={isPreview}
      isStructure={isStructure}
      isDragging={isDragging}
      isLocked={node.meta?.locked}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
      setDragRef={setDragRef}
      onClick={handleClick}
    >
      <BlockComponent node={node} isSelected={isSelected} isPreview={isPreview} isStructure={isStructure}>
        {children}
      </BlockComponent>
    </BlockWrapper>
  );
});

BlockRenderer.displayName = 'BlockRenderer';

export default BlockRenderer;
