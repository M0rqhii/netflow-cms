/**
 * Drag & Drop Utilities
 * 
 * Precyzyjny algorytm insertion index dla @dnd-kit
 */

import type { ClientRect } from '@dnd-kit/core';
import type { PageContent, BlockNode } from './types';
import { blockRegistry, canAddChild } from './block-registry';

// =============================================================================
// TYPES
// =============================================================================

export type InsertPosition = {
  parentId: string;
  index: number;
};

export type DropValidation = {
  valid: boolean;
  errorMessage?: string;
};

// =============================================================================
// CALCULATE INSERT INDEX
// =============================================================================

/**
 * Oblicza precyzyjny index wstawienia na podstawie pozycji kursora
 * 
 * @param pointerY - pozycja Y kursora
 * @param containerRect - rect kontenera (parent)
 * @param childRects - recty dzieci (w kolejności childIds)
 * @param gap - gap między dziećmi (opcjonalnie)
 */
export function calculateInsertIndex(
  pointerY: number,
  _containerRect: ClientRect,
  childRects: ClientRect[],
  _gap: number = 8
): number {
  // Empty container - insert at 0
  if (childRects.length === 0) {
    return 0;
  }
  
  // Check each gap between children
  for (let i = 0; i < childRects.length; i++) {
    const childRect = childRects[i];
    const childMiddleY = childRect.top + childRect.height / 2;
    
    // If pointer is above the middle of this child, insert before it
    if (pointerY < childMiddleY) {
      return i;
    }
  }
  
  // Pointer is below all children - insert at end
  return childRects.length;
}

/**
 * Oblicza insert index dla horizontal layout
 */
export function calculateInsertIndexHorizontal(
  pointerX: number,
  _containerRect: ClientRect,
  childRects: ClientRect[],
  _gap: number = 8
): number {
  if (childRects.length === 0) {
    return 0;
  }
  
  for (let i = 0; i < childRects.length; i++) {
    const childRect = childRects[i];
    const childMiddleX = childRect.left + childRect.width / 2;
    
    if (pointerX < childMiddleX) {
      return i;
    }
  }
  
  return childRects.length;
}

// =============================================================================
// DROP VALIDATION
// =============================================================================

/**
 * Waliduje czy drop jest dozwolony
 */
export function validateDrop(
  draggedType: string,
  targetParentType: string,
  content: PageContent,
  draggedNodeId?: string,
  targetParentId?: string
): DropValidation {
  // Check composition rules
  if (!canAddChild(targetParentType, draggedType)) {
    return {
      valid: false,
      errorMessage: blockRegistry.getCompositionErrorMessage(targetParentType, draggedType),
    };
  }
  
  // Check if target parent is locked
  if (targetParentId && content.nodes[targetParentId]?.meta?.locked) {
    return {
      valid: false,
      errorMessage: 'Cannot drop into a locked block',
    };
  }
  
  // Check if dragging into own descendant (cycle prevention)
  if (draggedNodeId && targetParentId) {
    if (isDescendant(content, draggedNodeId, targetParentId)) {
      return {
        valid: false,
        errorMessage: 'Cannot drop a block into its own descendant',
      };
    }
  }
  
  return { valid: true };
}

/**
 * Sprawdza czy target jest potomkiem source (cycle prevention)
 */
function isDescendant(
  content: PageContent,
  sourceId: string,
  targetId: string
): boolean {
  let current = content.nodes[targetId];
  
  while (current && current.parentId) {
    if (current.parentId === sourceId) {
      return true;
    }
    current = content.nodes[current.parentId];
  }
  
  return false;
}

// =============================================================================
// COLLISION DETECTION HELPERS
// =============================================================================

/**
 * Znajduje najbliższy valid drop target
 */
export function findNearestValidDropTarget(
  content: PageContent,
  draggedType: string,
  startFromId: string,
  draggedNodeId?: string
): string | null {
  let currentId: string | null = startFromId;
  
  while (currentId) {
    const node: BlockNode | undefined = content.nodes[currentId];
    if (!node) break;
    
    const validation = validateDrop(
      draggedType,
      node.type,
      content,
      draggedNodeId,
      currentId
    );
    
    if (validation.valid) {
      return currentId;
    }
    
    currentId = node.parentId;
  }
  
  return null;
}

// =============================================================================
// INSERTION LINE POSITION
// =============================================================================

export type InsertionLinePosition = {
  top: number;
  left: number;
  width: number;
};

/**
 * Oblicza pozycję linii wskazującej miejsce wstawienia
 */
export function calculateInsertionLinePosition(
  index: number,
  containerRect: ClientRect,
  childRects: ClientRect[],
  gap: number = 8
): InsertionLinePosition {
  const padding = 8;
  
  // Empty container
  if (childRects.length === 0) {
    return {
      top: containerRect.top + padding,
      left: containerRect.left + padding,
      width: containerRect.width - padding * 2,
    };
  }
  
  // Insert at beginning
  if (index === 0) {
    const firstChild = childRects[0];
    return {
      top: firstChild.top - gap / 2,
      left: containerRect.left + padding,
      width: containerRect.width - padding * 2,
    };
  }
  
  // Insert at end
  if (index >= childRects.length) {
    const lastChild = childRects[childRects.length - 1];
    return {
      top: lastChild.top + lastChild.height + gap / 2,
      left: containerRect.left + padding,
      width: containerRect.width - padding * 2,
    };
  }
  
  // Insert between
  const prevChild = childRects[index - 1];
  const nextChild = childRects[index];
  const midY = prevChild.top + prevChild.height + (nextChild.top - (prevChild.top + prevChild.height)) / 2;
  
  return {
    top: midY,
    left: containerRect.left + padding,
    width: containerRect.width - padding * 2,
  };
}

// =============================================================================
// DRAG DATA HELPERS
// =============================================================================

export type DragDataNewBlock = {
  dragType: 'new-block';
  blockType: string;
};

export type DragDataExistingNode = {
  dragType: 'existing-node';
  nodeId: string;
  nodeType: string;
};

export type DragData = DragDataNewBlock | DragDataExistingNode;

export function isNewBlockDrag(data: DragData): data is DragDataNewBlock {
  return data.dragType === 'new-block';
}

export function isExistingNodeDrag(data: DragData): data is DragDataExistingNode {
  return data.dragType === 'existing-node';
}

export function getDraggedType(data: DragData): string {
  return isNewBlockDrag(data) ? data.blockType : data.nodeType;
}
