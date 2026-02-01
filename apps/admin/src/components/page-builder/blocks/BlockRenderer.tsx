/**
 * Block Renderer Component
 * 
 * Dynamicznie renderuje blok na podstawie typu.
 * Obsługuje unknown blocks gracefully.
 */

import React, { memo, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useBlockNode, useIsBlockSelected, usePageBuilderStore } from '@/stores/page-builder-store';
import { useEnabledModules } from '../PageBuilderContext';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { BlockWrapper } from './BlockWrapper';
import { UnknownBlock } from './UnknownBlock';
import { ModuleDisabledBlock } from './ModuleDisabledBlock';
import type { DragDataExistingNode } from '@/lib/page-builder/dnd-utils';
import styles from './BlockRenderer.module.css';

type BlockRendererProps = {
  nodeId: string;
  isPreview?: boolean;
  isStructure?: boolean;
};

export const BlockRenderer: React.FC<BlockRendererProps> = memo(({ nodeId, isPreview = false, isStructure = false }) => {
  const node = useBlockNode(nodeId);
  const isSelected = useIsBlockSelected(nodeId);
  const selectBlock = usePageBuilderStore((state) => state.selectBlock);
  const enabledModules = useEnabledModules();
  
  // Get block definition
  const definition = useMemo(() => {
    return node ? blockRegistry.getBlock(node.type) : null;
  }, [node]);

  const moduleKey = definition?.moduleKey;
  const moduleDisabled = Boolean(moduleKey && !enabledModules.includes(moduleKey));
  
  // Draggable setup
  const dragData: DragDataExistingNode = useMemo(() => ({
    dragType: 'existing-node',
    nodeId,
    nodeType: node?.type || 'unknown',
  }), [nodeId, node?.type]);
  
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
  
  // Droppable setup (for container blocks)
  const canHaveChildren = definition?.canHaveChildren && !moduleDisabled ? true : false;
  
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `drop-${nodeId}`,
    data: {
      isDropZone: true,
      parentId: nodeId,
    },
    disabled: !canHaveChildren || isPreview,
  });
  
  // Handle missing node
  if (!node) {
    console.warn(`[BlockRenderer] Node "${nodeId}" not found`);
    return null;
  }
  
  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPreview) {
      selectBlock(nodeId);
    }
  };
  
  // Render unknown block if definition not found
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

  // Get component
  const BlockComponent = definition.component;
  
  // Render children for container blocks
  const children = canHaveChildren ? (
    <div 
      ref={setDropRef}
      className={styles.childrenContainer}
      data-drop-target={isOver}
    >
      {node.childIds.map((childId) => (
        <BlockRenderer
          key={childId}
          nodeId={childId}
          isPreview={isPreview}
          isStructure={isStructure}
        />
      ))}
      {node.childIds.length === 0 && !isPreview && (
        <div className={styles.emptyPlaceholder}>
          Upu�� blok tutaj
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
      <BlockComponent
        node={node}
        isSelected={isSelected}
        isPreview={isPreview}
        isStructure={isStructure}
      >
        {children}
      </BlockComponent>
    </BlockWrapper>
  );
});

BlockRenderer.displayName = 'BlockRenderer';

export default BlockRenderer;


