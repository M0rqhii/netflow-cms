/**
 * BlockWrapper
 * 
 * Wrapper dla wszystkich bloków z:
 * - Selection handling
 * - Hover states
 * - Drag attributes przekazane z BlockRenderer
 * - Block controls overlay
 * 
 * WAŻNE: React.memo() z custom comparison dla performance!
 */

import React, { memo, useCallback } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { cn } from '@/lib/utils';
import { useBlockNode } from '@/stores/page-builder-store';
import { BlockControls } from './BlockControls';
import styles from './BlockWrapper.module.css';

interface BlockWrapperProps {
  nodeId: string;
  children: React.ReactNode;
  isSelected?: boolean;
  isPreview?: boolean;
  isDragging?: boolean;
  isLocked?: boolean;
  isStructure?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  setDragRef?: (node: HTMLElement | null) => void;
  onClick?: (e: React.MouseEvent) => void;
}

function BlockWrapperComponent({ 
  nodeId, 
  children,
  isSelected = false,
  isPreview = false,
  isDragging = false,
  isLocked = false,
  isStructure = false,
  dragAttributes,
  dragListeners,
  setDragRef,
  onClick,
}: BlockWrapperProps) {
  const node = useBlockNode(nodeId);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isPreview) {
      e.stopPropagation();
      onClick?.(e as unknown as React.MouseEvent);
    }
  }, [isPreview, onClick]);
  
  if (!node) {
    return null;
  }
  
  // In preview mode, just render children without wrapper UI
  if (isPreview) {
    return (
      <div 
        data-block-id={nodeId} 
        data-block-wrapper
      >
        {children}
      </div>
    );
  }
  
  const isHidden = node.meta?.hidden;
  
  return (
    <div
      ref={setDragRef}
      className={cn(
        styles.wrapper,
        isSelected && styles.selected,
        !isSelected && styles.hoverable,
        isDragging && styles.dragging,
        isLocked && styles.locked,
        isHidden && styles.hidden,
        isStructure && styles.structure
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      data-block-id={nodeId}
      data-block-type={node.type}
      data-block-wrapper
      {...dragAttributes}
    >
      {/* Drag handle */}
      {!isLocked && (
        <div
          {...dragListeners}
          className={cn(
            styles.dragHandle,
            isSelected && styles.visible
          )}
          title="Drag to move"
        >
          <svg className={styles.dragIcon} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}
      
      {/* Lock indicator */}
      {isLocked && (
        <div className={styles.lockIndicator} title="Locked">
          <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17a2 2 0 002-2v-2a2 2 0 00-4 0v2a2 2 0 002 2zm6-7V8a6 6 0 00-12 0v2a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2z" />
          </svg>
        </div>
      )}
      
      {/* Block type label (on hover) */}
      <div className={cn(styles.typeLabel, (isSelected || isStructure) && styles.visible)}>
        {node.meta?.label || node.type}
      </div>
      
      {/* Block controls (on selection) */}
      {isSelected && <BlockControls nodeId={nodeId} />}
      
      {/* Content */}
      {children}
    </div>
  );
}

// Custom comparison for memo
function arePropsEqual(
  prevProps: BlockWrapperProps,
  nextProps: BlockWrapperProps
): boolean {
  return (
    prevProps.nodeId === nextProps.nodeId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isPreview === nextProps.isPreview &&
    prevProps.isStructure === nextProps.isStructure &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isLocked === nextProps.isLocked
  );
}

export const BlockWrapper = memo(BlockWrapperComponent, arePropsEqual);
