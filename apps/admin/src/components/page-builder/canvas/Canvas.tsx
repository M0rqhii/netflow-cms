/**
 * Canvas Component
 * 
 * Główny obszar edycji z single DndContext.
 * Renderuje drzewo bloków i obsługuje drag & drop.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  usePageBuilderStore,
  useBlockChildren,
  useCurrentBreakpoint,
  useEditorMode,
} from '@/stores/page-builder-store';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { InsertionLine } from './InsertionLine';
import { DragPreview } from './DragPreview';
import { EmptyCanvasPlaceholder } from './EmptyCanvasPlaceholder';
import {
  DragData,
  isNewBlockDrag,
  getDraggedType,
  validateDrop,
  calculateInsertIndex,
} from '@/lib/page-builder/dnd-utils';
import { cn } from '@/lib/utils';
import styles from './Canvas.module.css';

// =============================================================================
// TYPES
// =============================================================================

type InsertionIndicator = {
  parentId: string;
  index: number;
  top: number;
  left: number;
  width: number;
} | null;

// =============================================================================
// BREAKPOINT WIDTHS
// =============================================================================

const BREAKPOINT_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

// =============================================================================
// CANVAS COMPONENT
// =============================================================================

export const Canvas: React.FC = () => {
  const content = usePageBuilderStore((state) => state.content);
  const rootId = content.rootId;
  const rootChildIds = useBlockChildren(rootId);
  const currentBreakpoint = useCurrentBreakpoint();
  const mode = useEditorMode();
  
  const addBlock = usePageBuilderStore((state) => state.addBlock);
  const moveBlock = usePageBuilderStore((state) => state.moveBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const selectBlock = usePageBuilderStore((state) => state.selectBlock);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<InsertionIndicator>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Custom collision detection - hybrid approach
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First try pointerWithin for precise nested drops
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    // Fallback to rectIntersection
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    
    // Last resort - closestCenter
    return closestCenter(args);
  }, []);
  
  // ==========================================================================
  // DRAG HANDLERS
  // ==========================================================================
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData;
    
    setActiveDragData(data);
    
    // Clear selection when starting drag
    selectBlock(null);
  }, [selectBlock]);
  
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Update insertion indicator position based on cursor
    // This is handled by DragOver for simplicity
  }, []);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !activeDragData) {
      setInsertionIndicator(null);
      setDropTargetId(null);
      return;
    }
    
    const overId = over.id as string;
    const overData = over.data.current;
    
    // Determine target parent and index
    let targetParentId: string;
    let targetIndex: number;
    
    if (overData?.isDropZone) {
      // Dropping into explicit drop zone
      targetParentId = overData.parentId;
      targetIndex = overData.index ?? 0;
    } else {
      // Dropping onto a block - use its parent
      const overNode = content.nodes[overId];
      if (!overNode || !overNode.parentId) {
        setInsertionIndicator(null);
        setDropTargetId(null);
        return;
      }
      
      targetParentId = overNode.parentId;
      const parent = content.nodes[targetParentId];
      targetIndex = parent.childIds.indexOf(overId);
      
      // Calculate precise index based on cursor position
      if (over.rect && event.active.rect.current.translated) {
        const pointerY = event.active.rect.current.translated.top;
        const overMiddle = over.rect.top + over.rect.height / 2;
        
        if (pointerY > overMiddle) {
          targetIndex += 1;
        }
      }
    }
    
    // Validate drop
    const draggedType = getDraggedType(activeDragData);
    const targetParent = content.nodes[targetParentId];
    
    if (!targetParent) {
      setInsertionIndicator(null);
      setDropTargetId(null);
      return;
    }
    
    const validation = validateDrop(
      draggedType,
      targetParent.type,
      content,
      isNewBlockDrag(activeDragData) ? undefined : activeDragData.nodeId,
      targetParentId
    );
    
    if (!validation.valid) {
      setInsertionIndicator(null);
      setDropTargetId(null);
      return;
    }
    
    // Set drop target for visual feedback
    setDropTargetId(targetParentId);
    
    // Calculate insertion line position
    // (simplified - in production would use actual DOM measurements)
    setInsertionIndicator({
      parentId: targetParentId,
      index: targetIndex,
      top: 0, // Will be calculated by InsertionLine component
      left: 0,
      width: 0,
    });
  }, [activeDragData, content]);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragData(null);
    setInsertionIndicator(null);
    setDropTargetId(null);
    
    if (!over || !activeDragData) return;
    
    const overId = over.id as string;
    const overData = over.data.current;
    
    // Determine target
    let targetParentId: string;
    let targetIndex: number;
    
    if (overData?.isDropZone) {
      targetParentId = overData.parentId;
      targetIndex = overData.index ?? content.nodes[targetParentId]?.childIds.length ?? 0;
    } else {
      const overNode = content.nodes[overId];
      if (!overNode || !overNode.parentId) return;
      
      targetParentId = overNode.parentId;
      const parent = content.nodes[targetParentId];
      targetIndex = parent.childIds.indexOf(overId);
      
      // Adjust for cursor position
      if (over.rect && event.active.rect.current.translated) {
        const pointerY = event.active.rect.current.translated.top;
        const overMiddle = over.rect.top + over.rect.height / 2;
        
        if (pointerY > overMiddle) {
          targetIndex += 1;
        }
      }
    }
    
    // Validate
    const draggedType = getDraggedType(activeDragData);
    const targetParent = content.nodes[targetParentId];
    
    if (!targetParent) return;
    
    const validation = validateDrop(
      draggedType,
      targetParent.type,
      content,
      isNewBlockDrag(activeDragData) ? undefined : activeDragData.nodeId,
      targetParentId
    );
    
    if (!validation.valid) {
      console.warn('[Canvas] Invalid drop:', validation.errorMessage);
      return;
    }
    
    // Execute drop
    if (isNewBlockDrag(activeDragData)) {
      // Add new block
      const newId = addBlock(targetParentId, activeDragData.blockType, targetIndex);
      if (newId) {
        commit('add');
        selectBlock(newId);
      }
    } else {
      // Move existing block
      const nodeId = activeDragData.nodeId;
      
      // Adjust index if moving within same parent
      const node = content.nodes[nodeId];
      if (node.parentId === targetParentId) {
        const currentIndex = content.nodes[targetParentId].childIds.indexOf(nodeId);
        if (currentIndex < targetIndex) {
          targetIndex -= 1;
        }
      }
      
      moveBlock(nodeId, targetParentId, targetIndex);
      commit('dnd');
      selectBlock(nodeId);
    }
  }, [activeDragData, content, addBlock, moveBlock, commit, selectBlock]);
  
  const handleDragCancel = useCallback(() => {
    setActiveDragData(null);
    setInsertionIndicator(null);
    setDropTargetId(null);
  }, []);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  const canvasWidth = BREAKPOINT_WIDTHS[currentBreakpoint];
  const isPreview = mode === 'preview';
  
  const isEmpty = rootChildIds.length === 0;
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.canvasContainer}>
        <div
          ref={canvasRef}
          className={cn(
            styles.canvas,
            isPreview && styles.previewMode,
            currentBreakpoint !== 'desktop' && styles.responsiveMode
          )}
          style={{ maxWidth: canvasWidth }}
          onClick={(e) => {
            // Click on empty canvas area deselects
            if (e.target === e.currentTarget) {
              selectBlock(null);
            }
          }}
        >
          {isEmpty ? (
            <EmptyCanvasPlaceholder rootId={rootId} />
          ) : (
            <div className={styles.blockTree}>
              {rootChildIds.map((childId) => (
                <BlockRenderer
                  key={childId}
                  nodeId={childId}
                  isPreview={isPreview}
                />
              ))}
            </div>
          )}
          
          {/* Insertion Line */}
          {insertionIndicator && !isPreview && (
            <InsertionLine
              parentId={insertionIndicator.parentId}
              index={insertionIndicator.index}
            />
          )}
        </div>
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragData && (
          <DragPreview data={activeDragData} />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default Canvas;
