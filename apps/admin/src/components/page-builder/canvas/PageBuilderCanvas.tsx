"use client";

/**
 * PageBuilderCanvas - Bridge Component
 * 
 * Most między starym API (content jako props) a nowym systemem (Zustand store).
 * Inicjalizuje store z props i synchronizuje zmiany z powrotem.
 * 
 * UWAGA: DndContext jest w parent komponencie (page.tsx), ten komponent tylko renderuje canvas.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { usePageBuilderStore, useBlockChildren, useCurrentBreakpoint, useEditorMode } from '@/stores/page-builder-store';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { EmptyCanvasPlaceholder } from './EmptyCanvasPlaceholder';
import { registerAllBlocks } from '../blocks/registerBlocks';
import type { PageContent } from '@/lib/page-builder/types';
import { cn } from '@/lib/utils';
import styles from './Canvas.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface PageBuilderCanvasProps {
  /** Content z API - initial state */
  content?: unknown;
  /** Callback gdy content się zmieni */
  onContentChange?: (content: unknown) => void;
  /** Deprecated - nie używane */
  blocks?: unknown[];
}

// =============================================================================
// BREAKPOINT WIDTHS
// =============================================================================

const BREAKPOINT_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
} as const;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PageBuilderCanvas({ content, onContentChange }: PageBuilderCanvasProps) {
  const initializationRef = useRef(false);
  const syncRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store state
  const storeContent = usePageBuilderStore((s) => s.content);
  const initContent = usePageBuilderStore((s) => s.initContent);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  
  const currentBreakpoint = useCurrentBreakpoint();
  const mode = useEditorMode();
  const isPreview = mode === 'preview';
  const isStructure = mode === 'structure';
  const rootChildren = useBlockChildren(storeContent.rootId);
  
  // Register blocks on mount
  useEffect(() => {
    registerAllBlocks();
  }, []);
  
  // Initialize content from props (once)
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    if (content && typeof content === 'object') {
      const pageContent = content as PageContent;
      // Check if it's a valid PageContent structure
      if (pageContent.rootId && pageContent.nodes) {
        initContent(pageContent);
      } else {
        // Convert old format or create empty
        initContent({
          version: '1.0.0',
          rootId: 'root',
          nodes: {
            root: {
              id: 'root',
              type: 'root',
              parentId: null,
              childIds: [],
              props: { content: {}, style: { base: {} } },
            },
          },
        });
      }
    }
  }, [content, initContent]);
  
  // Sync store changes back to parent (debounced)
  useEffect(() => {
    if (!onContentChange) return;
    if (!initializationRef.current) return;
    
    // Clear previous timeout
    if (syncRef.current) {
      clearTimeout(syncRef.current);
    }
    
    // Debounce sync
    syncRef.current = setTimeout(() => {
      onContentChange(storeContent);
    }, 100);
    
    return () => {
      if (syncRef.current) {
        clearTimeout(syncRef.current);
      }
    };
  }, [storeContent, onContentChange]);
  
  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectBlock(null);
    }
  }, [selectBlock]);
  
  // Setup canvas as droppable (for dropping onto empty canvas)
  const { setNodeRef: setCanvasRef, isOver: isOverCanvas } = useDroppable({
    id: 'canvas-root-drop',
    data: {
      isDropZone: true,
      parentId: storeContent.rootId,
      index: rootChildren.length,
    },
  });
  
  // Canvas width based on breakpoint
  const canvasWidth = BREAKPOINT_WIDTHS[currentBreakpoint];
  
  // Check if canvas is empty
  const isEmpty = rootChildren.length === 0;
  
  return (
    <div className={styles.canvasContainer}>
      {currentBreakpoint !== 'desktop' && !isPreview && (
        <div className={styles.breakpointNotice}>
          Zmiany struktury wpływają na wszystkie breakpointy.
        </div>
      )}

      <div
        ref={setCanvasRef}
        className={cn(
          styles.canvas,
          isPreview && styles.previewMode,
          isStructure && styles.structureMode,
          isOverCanvas && styles.isOver
        )}
        style={{ maxWidth: canvasWidth }}
        onClick={handleCanvasClick}
      >
        {isEmpty ? (
          <EmptyCanvasPlaceholder rootId={storeContent.rootId} />
        ) : (
          <div className={styles.blocksContainer}>
            {rootChildren.map((childId) => (
              <BlockRenderer key={childId} nodeId={childId} isPreview={isPreview} isStructure={isStructure} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageBuilderCanvas;
