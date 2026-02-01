/**
 * Keyboard Shortcuts Hook
 * 
 * Centralna obsługa skrótów klawiszowych dla Page Buildera.
 * 
 * Shortcuts:
 * - Delete/Backspace: usuń wybrany blok
 * - Ctrl+Z: undo
 * - Ctrl+Y / Ctrl+Shift+Z: redo
 * - Ctrl+C: kopiuj blok
 * - Ctrl+V: wklej blok
 * - Ctrl+X: wytnij blok
 * - Ctrl+S: zapisz
 * - Alt+Up: przesuń blok w górę
 * - Alt+Down: przesuń blok w dół
 * - Escape: anuluj selekcję
 * - Tab: nawigacja po blokach
 */

import { useEffect, useCallback } from 'react';
import { usePageBuilderStore } from '@/stores/page-builder-store';

type KeyboardShortcutsOptions = {
  onSave?: () => void;
  enabled?: boolean;
};

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onSave, enabled = true } = options;
  
  const selectedBlockId = usePageBuilderStore((state) => state.selectedBlockId);
  const content = usePageBuilderStore((state) => state.content);
  
  const deleteBlock = usePageBuilderStore((state) => state.deleteBlock);
  const undo = usePageBuilderStore((state) => state.undo);
  const redo = usePageBuilderStore((state) => state.redo);
  const copyBlock = usePageBuilderStore((state) => state.copyBlock);
  const pasteBlock = usePageBuilderStore((state) => state.pasteBlock);
  const cutBlock = usePageBuilderStore((state) => state.cutBlock);
  const moveBlockUp = usePageBuilderStore((state) => state.moveBlockUp);
  const moveBlockDown = usePageBuilderStore((state) => state.moveBlockDown);
  const selectBlock = usePageBuilderStore((state) => state.selectBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  
  // Navigate between blocks
  const navigateBlocks = useCallback((direction: 'next' | 'prev') => {
    const { content, selectedBlockId, selectBlock } = usePageBuilderStore.getState();
    
    // Get flat list of block IDs (depth-first)
    const blockIds: string[] = [];
    
    const traverse = (nodeId: string) => {
      const node = content.nodes[nodeId];
      if (!node) return;
      
      // Skip root
      if (node.parentId !== null) {
        blockIds.push(nodeId);
      }
      
      for (const childId of node.childIds) {
        traverse(childId);
      }
    };
    
    traverse(content.rootId);
    
    if (blockIds.length === 0) return;
    
    // Find next/prev
    if (!selectedBlockId) {
      selectBlock(direction === 'next' ? blockIds[0] : blockIds[blockIds.length - 1]);
      return;
    }
    
    const currentIndex = blockIds.indexOf(selectedBlockId);
    if (currentIndex === -1) {
      selectBlock(blockIds[0]);
      return;
    }
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Wrap around
    if (nextIndex < 0) nextIndex = blockIds.length - 1;
    if (nextIndex >= blockIds.length) nextIndex = 0;
    
    selectBlock(blockIds[nextIndex]);
  }, []);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if disabled or in input/textarea
    if (!enabled) return;
    
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable;
    
    // Allow Escape even in inputs
    if (e.key === 'Escape') {
      selectBlock(null);
      (document.activeElement as HTMLElement)?.blur();
      return;
    }
    
    // Skip other shortcuts if in input
    if (isInput) return;
    
    const { ctrlKey, metaKey, shiftKey, altKey, key } = e;
    const cmdOrCtrl = ctrlKey || metaKey;
    
    // Delete selected block
    if ((key === 'Delete' || key === 'Backspace') && selectedBlockId) {
      e.preventDefault();
      const node = content.nodes[selectedBlockId];
      if (node && !node.meta?.locked && node.parentId) {
        deleteBlock(selectedBlockId);
        commit('delete');
      }
      return;
    }
    
    // Undo
    if (cmdOrCtrl && key === 'z' && !shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    // Redo (Ctrl+Y or Ctrl+Shift+Z)
    if ((cmdOrCtrl && key === 'y') || (cmdOrCtrl && shiftKey && key === 'z')) {
      e.preventDefault();
      redo();
      return;
    }
    
    // Copy
    if (cmdOrCtrl && key === 'c' && selectedBlockId) {
      e.preventDefault();
      copyBlock(selectedBlockId);
      return;
    }
    
    // Cut
    if (cmdOrCtrl && key === 'x' && selectedBlockId) {
      e.preventDefault();
      cutBlock(selectedBlockId);
      return;
    }
    
    // Paste
    if (cmdOrCtrl && key === 'v') {
      e.preventDefault();
      const clipboard = usePageBuilderStore.getState().clipboard;
      if (clipboard) {
        // Paste into selected block or root
        const targetId = selectedBlockId 
          ? content.nodes[selectedBlockId]?.parentId || content.rootId
          : content.rootId;
        pasteBlock(targetId);
        commit('paste');
      }
      return;
    }
    
    // Save
    if (cmdOrCtrl && key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }
    
    // Move up
    if (altKey && key === 'ArrowUp' && selectedBlockId) {
      e.preventDefault();
      moveBlockUp(selectedBlockId);
      commit('shortcut');
      return;
    }
    
    // Move down
    if (altKey && key === 'ArrowDown' && selectedBlockId) {
      e.preventDefault();
      moveBlockDown(selectedBlockId);
      commit('shortcut');
      return;
    }
    
    // Tab navigation
    if (key === 'Tab' && !cmdOrCtrl && !altKey) {
      e.preventDefault();
      navigateBlocks(shiftKey ? 'prev' : 'next');
      return;
    }
  }, [
    enabled,
    selectedBlockId,
    content,
    deleteBlock,
    undo,
    redo,
    copyBlock,
    pasteBlock,
    cutBlock,
    moveBlockUp,
    moveBlockDown,
    selectBlock,
    commit,
    onSave,
    navigateBlocks,
  ]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
