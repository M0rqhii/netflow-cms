/**
 * Page Builder Store (Zustand)
 * 
 * Centralne zarządzanie stanem page buildera:
 * - Normalized tree (content)
 * - Draft vs committed state (isDirty, commit)
 * - History (undo/redo)
 * - Selection
 * - Clipboard
 * - UI state (breakpoint, mode)
 * 
 * Używaj selektorów per node dla performance!
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  PageContent,
  BlockNode,
  BlockProps,
  Breakpoint,
  EditorMode,
  SaveStatus,
  CommitReason,
  ClipboardData,
  HistoryState,
} from '@/lib/page-builder/types';
import {
  insertNode,
  moveNode,
  removeNode,
  cloneSubtree,
  updateNodeProps,
  updateNodeMeta,
  moveNodeInSiblings,
  createNodeId,
  validateTree,
} from '@/lib/page-builder/tree-ops';
import { blockRegistry, canAddChild } from '@/lib/page-builder/block-registry';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_HISTORY_SIZE = 50;
const DEFAULT_COMMIT_DELAY = 400;

// =============================================================================
// STATE TYPE
// =============================================================================

interface PageBuilderState {
  // Content (normalized tree)
  content: PageContent;
  
  // Draft state
  isDirty: boolean;
  
  // Selection
  selectedBlockId: string | null;
  
  // History
  history: HistoryState;
  lastCommitReason: CommitReason | null;
  
  // UI state
  currentBreakpoint: Breakpoint;
  mode: EditorMode;
  
  // Clipboard
  clipboard: ClipboardData | null;
  
  // Save
  lastSaved: Date | null;
  saveStatus: SaveStatus;
  retryCount: number;
  
  // Properties panel
  propertiesPanelOpen: boolean;
}

interface PageBuilderActions {
  // Initialization
  initContent: (content: PageContent) => void;
  resetContent: () => void;
  
  // Block operations
  addBlock: (parentId: string, blockType: string, index?: number) => string | null;
  moveBlock: (nodeId: string, newParentId: string, newIndex: number) => void;
  deleteBlock: (nodeId: string) => void;
  updateBlockProps: (nodeId: string, props: Partial<BlockProps>) => void;
  updateBlockMeta: (nodeId: string, meta: Partial<BlockNode['meta']>) => void;
  
  // Move in siblings
  moveBlockUp: (nodeId: string) => void;
  moveBlockDown: (nodeId: string) => void;
  
  // Selection
  selectBlock: (nodeId: string | null) => void;
  
  // History
  commit: (reason: CommitReason) => void;
  scheduleCommit: (ms?: number) => void;
  undo: () => void;
  redo: () => void;
  
  // Clipboard
  copyBlock: (nodeId: string) => void;
  cutBlock: (nodeId: string) => void;
  pasteBlock: (parentId: string, index?: number) => void;
  
  // UI
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setMode: (mode: EditorMode) => void;
  togglePropertiesPanel: () => void;
  openPropertiesPanel: () => void;
  
  // Save
  markDirty: () => void;
  markSaved: () => void;
  setSaveStatus: (status: SaveStatus) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

function createInitialContent(): PageContent {
  const rootId = createNodeId();
  return {
    version: '1.0',
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        type: 'root',
        parentId: null,
        childIds: [],
        props: {
          content: {},
          style: { base: {} },
        },
      },
    },
  };
}

const initialState: PageBuilderState = {
  content: createInitialContent(),
  isDirty: false,
  selectedBlockId: null,
  history: { past: [], future: [] },
  lastCommitReason: null,
  currentBreakpoint: 'desktop',
  mode: 'edit',
  clipboard: null,
  lastSaved: null,
  saveStatus: 'idle',
  retryCount: 0,
  propertiesPanelOpen: true,
};

// =============================================================================
// COMMIT TIMEOUT
// =============================================================================

let commitTimeout: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// STORE
// =============================================================================

export const usePageBuilderStore = create<PageBuilderState & PageBuilderActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    initContent: (content: PageContent) => {
      // Validate in dev mode
      if (process.env.NODE_ENV === 'development') {
        const errors = validateTree(content);
        if (errors.length > 0) {
          console.error('[PageBuilder] Tree validation failed:', errors);
        }
      }
      
      set({
        content,
        isDirty: false,
        selectedBlockId: null,
        history: { past: [], future: [] },
        lastCommitReason: null,
      });
    },
    
    resetContent: () => {
      set({
        ...initialState,
        content: createInitialContent(),
      });
    },
    
    // =========================================================================
    // BLOCK OPERATIONS
    // =========================================================================
    
    addBlock: (parentId: string, blockType: string, index?: number) => {
      const { content } = get();
      const parent = content.nodes[parentId];
      
      if (!parent) {
        console.error(`[PageBuilder] Parent "${parentId}" not found`);
        return null;
      }
      
      // Check composition rules
      if (!canAddChild(parent.type, blockType)) {
        const errorMsg = blockRegistry.getCompositionErrorMessage(parent.type, blockType);
        console.warn(`[PageBuilder] ${errorMsg}`);
        return null;
      }
      
      // Get block definition
      const definition = blockRegistry.getBlock(blockType);
      if (!definition) {
        console.error(`[PageBuilder] Block type "${blockType}" not registered`);
        return null;
      }
      
      // Create new node
      const newNode: BlockNode = {
        id: createNodeId(),
        type: blockType,
        parentId,
        childIds: [],
        props: structuredClone(definition.defaultProps),
      };
      
      // Insert
      const insertIndex = index ?? parent.childIds.length;
      const newContent = insertNode(content, parentId, insertIndex, newNode);
      
      set({
        content: newContent,
        isDirty: true,
        selectedBlockId: newNode.id,
      });
      
      return newNode.id;
    },
    
    moveBlock: (nodeId: string, newParentId: string, newIndex: number) => {
      const { content } = get();
      const node = content.nodes[nodeId];
      const newParent = content.nodes[newParentId];
      
      if (!node || !newParent) {
        console.error(`[PageBuilder] Node or parent not found`);
        return;
      }
      
      // Check if node is locked
      if (node.meta?.locked) {
        console.warn(`[PageBuilder] Cannot move locked block`);
        return;
      }
      
      // Check composition rules
      if (!canAddChild(newParent.type, node.type)) {
        const errorMsg = blockRegistry.getCompositionErrorMessage(newParent.type, node.type);
        console.warn(`[PageBuilder] ${errorMsg}`);
        return;
      }
      
      // Check if new parent is locked (no paste into)
      if (newParent.meta?.locked && node.parentId !== newParentId) {
        console.warn(`[PageBuilder] Cannot move into locked block`);
        return;
      }
      
      const newContent = moveNode(content, nodeId, newParentId, newIndex);
      
      set({
        content: newContent,
        isDirty: true,
      });
    },
    
    deleteBlock: (nodeId: string) => {
      const { content, selectedBlockId } = get();
      const node = content.nodes[nodeId];
      
      if (!node) {
        console.error(`[PageBuilder] Node "${nodeId}" not found`);
        return;
      }
      
      // Cannot delete root
      if (!node.parentId) {
        console.warn(`[PageBuilder] Cannot delete root node`);
        return;
      }
      
      // Check if locked
      if (node.meta?.locked) {
        console.warn(`[PageBuilder] Cannot delete locked block`);
        return;
      }
      
      const newContent = removeNode(content, nodeId);
      
      set({
        content: newContent,
        isDirty: true,
        selectedBlockId: selectedBlockId === nodeId ? null : selectedBlockId,
      });
    },
    
    updateBlockProps: (nodeId: string, props: Partial<BlockProps>) => {
      const { content } = get();
      
      try {
        const newContent = updateNodeProps(content, nodeId, props);
        set({
          content: newContent,
          isDirty: true,
        });
      } catch (error) {
        console.error(`[PageBuilder] Failed to update props:`, error);
      }
    },
    
    updateBlockMeta: (nodeId: string, meta: Partial<BlockNode['meta']>) => {
      const { content } = get();
      
      try {
        const newContent = updateNodeMeta(content, nodeId, meta);
        set({
          content: newContent,
          isDirty: true,
        });
      } catch (error) {
        console.error(`[PageBuilder] Failed to update meta:`, error);
      }
    },
    
    // =========================================================================
    // MOVE IN SIBLINGS
    // =========================================================================
    
    moveBlockUp: (nodeId: string) => {
      const { content } = get();
      const node = content.nodes[nodeId];
      
      if (node?.meta?.locked) {
        console.warn(`[PageBuilder] Cannot move locked block`);
        return;
      }
      
      const newContent = moveNodeInSiblings(content, nodeId, 'up');
      if (newContent !== content) {
        set({ content: newContent, isDirty: true });
      }
    },
    
    moveBlockDown: (nodeId: string) => {
      const { content } = get();
      const node = content.nodes[nodeId];
      
      if (node?.meta?.locked) {
        console.warn(`[PageBuilder] Cannot move locked block`);
        return;
      }
      
      const newContent = moveNodeInSiblings(content, nodeId, 'down');
      if (newContent !== content) {
        set({ content: newContent, isDirty: true });
      }
    },
    
    // =========================================================================
    // SELECTION
    // =========================================================================
    
    selectBlock: (nodeId: string | null) => {
      set({ selectedBlockId: nodeId });
    },
    
    // =========================================================================
    // HISTORY (COMMIT-BASED)
    // =========================================================================
    
    commit: (reason: CommitReason) => {
      const { content, isDirty, history } = get();
      
      // Skip if nothing changed
      if (!isDirty) return;
      
      // Clear scheduled commit
      if (commitTimeout) {
        clearTimeout(commitTimeout);
        commitTimeout = null;
      }
      
      // Add current state to past
      const newPast = [...history.past, content].slice(-MAX_HISTORY_SIZE);
      
      set({
        history: { past: newPast, future: [] },
        isDirty: false,
        lastCommitReason: reason,
      });
      
      // Dev mode: validate after commit
      if (process.env.NODE_ENV === 'development') {
        const errors = validateTree(content);
        if (errors.length > 0) {
          console.error('[PageBuilder] Tree validation failed after commit:', errors);
        }
      }
    },
    
    scheduleCommit: (ms: number = DEFAULT_COMMIT_DELAY) => {
      // Clear existing timeout
      if (commitTimeout) {
        clearTimeout(commitTimeout);
      }
      
      // Schedule new commit
      commitTimeout = setTimeout(() => {
        get().commit('blur');
        commitTimeout = null;
      }, ms);
    },
    
    undo: () => {
      const { history, content } = get();
      
      if (history.past.length === 0) return;
      
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      
      set({
        content: previous,
        history: {
          past: newPast,
          future: [content, ...history.future],
        },
        isDirty: false,
        selectedBlockId: null,
      });
    },
    
    redo: () => {
      const { history, content } = get();
      
      if (history.future.length === 0) return;
      
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      
      set({
        content: next,
        history: {
          past: [...history.past, content],
          future: newFuture,
        },
        isDirty: false,
        selectedBlockId: null,
      });
    },
    
    // =========================================================================
    // CLIPBOARD
    // =========================================================================
    
    copyBlock: (nodeId: string) => {
      const { content } = get();
      
      try {
        const { newRootId, nodes } = cloneSubtree(content, nodeId);
        set({ clipboard: { rootId: newRootId, nodes } });
      } catch (error) {
        console.error(`[PageBuilder] Failed to copy block:`, error);
      }
    },
    
    cutBlock: (nodeId: string) => {
      const { copyBlock, deleteBlock, commit } = get();
      
      copyBlock(nodeId);
      deleteBlock(nodeId);
      commit('delete');
    },
    
    pasteBlock: (parentId: string, index?: number) => {
      const { content, clipboard } = get();
      
      if (!clipboard) {
        console.warn(`[PageBuilder] Clipboard is empty`);
        return;
      }
      
      const parent = content.nodes[parentId];
      if (!parent) {
        console.error(`[PageBuilder] Parent "${parentId}" not found`);
        return;
      }
      
      // Check if parent is locked
      if (parent.meta?.locked) {
        console.warn(`[PageBuilder] Cannot paste into locked block`);
        return;
      }
      
      const rootNode = clipboard.nodes[clipboard.rootId];
      if (!rootNode) {
        console.error(`[PageBuilder] Clipboard root node not found`);
        return;
      }
      
      // Check composition rules
      if (!canAddChild(parent.type, rootNode.type)) {
        const errorMsg = blockRegistry.getCompositionErrorMessage(parent.type, rootNode.type);
        console.warn(`[PageBuilder] ${errorMsg}`);
        return;
      }
      
      // Generate new IDs for pasted nodes
      const { nodes: newNodes, newRootId } = cloneSubtree(
        { ...content, nodes: { ...content.nodes, ...clipboard.nodes } },
        clipboard.rootId
      );
      
      // Build new content
      const newContent: PageContent = {
        ...content,
        nodes: { ...content.nodes, ...newNodes },
      };
      
      // Update parent's childIds
      const insertIndex = index ?? parent.childIds.length;
      const updatedParent = { ...parent };
      const newChildIds = [...updatedParent.childIds];
      newChildIds.splice(insertIndex, 0, newRootId);
      updatedParent.childIds = newChildIds;
      
      newContent.nodes[parentId] = updatedParent;
      newContent.nodes[newRootId] = {
        ...newContent.nodes[newRootId],
        parentId,
      };
      
      set({
        content: newContent,
        isDirty: true,
        selectedBlockId: newRootId,
      });
    },
    
    // =========================================================================
    // UI
    // =========================================================================
    
    setBreakpoint: (breakpoint: Breakpoint) => {
      set({ currentBreakpoint: breakpoint });
    },
    
    setMode: (mode: EditorMode) => {
      set({ 
        mode,
        selectedBlockId: mode === 'preview' ? null : get().selectedBlockId,
      });
    },
    
    togglePropertiesPanel: () => {
      set(state => ({ propertiesPanelOpen: !state.propertiesPanelOpen }));
    },
    
    openPropertiesPanel: () => {
      set({ propertiesPanelOpen: true });
    },
    
    // =========================================================================
    // SAVE
    // =========================================================================
    
    markDirty: () => {
      set({ isDirty: true });
    },
    
    markSaved: () => {
      set({
        isDirty: false,
        lastSaved: new Date(),
        saveStatus: 'saved',
        retryCount: 0,
      });
    },
    
    setSaveStatus: (status: SaveStatus) => {
      set({ saveStatus: status });
    },
  }))
);

// =============================================================================
// SELECTORS (dla performance)
// =============================================================================

/**
 * Subskrybuje tylko jeden node.
 * Używaj zamiast całego content!
 */
export const useBlockNode = (id: string) =>
  usePageBuilderStore((state) => state.content.nodes[id]);

/**
 * Subskrybuje tylko childIds node'a.
 */
export const useBlockChildren = (parentId: string) =>
  usePageBuilderStore((state) => state.content.nodes[parentId]?.childIds ?? []);

/**
 * Subskrybuje wybrany blok.
 */
export const useSelectedBlock = () =>
  usePageBuilderStore((state) =>
    state.selectedBlockId ? state.content.nodes[state.selectedBlockId] : null
  );

/**
 * Subskrybuje czy blok jest wybrany.
 */
export const useIsBlockSelected = (id: string) =>
  usePageBuilderStore((state) => state.selectedBlockId === id);

/**
 * Subskrybuje aktualny breakpoint.
 */
export const useCurrentBreakpoint = () =>
  usePageBuilderStore((state) => state.currentBreakpoint);

/**
 * Subskrybuje mode (edit/preview).
 */
export const useEditorMode = () =>
  usePageBuilderStore((state) => state.mode);

/**
 * Subskrybuje selectedBlockId.
 */
export const useSelectedBlockId = () =>
  usePageBuilderStore((state) => state.selectedBlockId);

/**
 * Subskrybuje isDirty.
 */
export const useIsDirty = () =>
  usePageBuilderStore((state) => state.isDirty);

/**
 * Subskrybuje save status.
 */
export const useSaveStatus = () =>
  usePageBuilderStore((state) => ({
    status: state.saveStatus,
    lastSaved: state.lastSaved,
  }));

/**
 * Subskrybuje history info.
 */
export const useHistoryInfo = () =>
  usePageBuilderStore((state) => ({
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    lastCommitReason: state.lastCommitReason,
  }));
