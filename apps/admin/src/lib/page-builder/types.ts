/**
 * Page Builder Types
 * 
 * Normalized tree model z RootBlock.
 * Dziedziczenie responsive styles = brak klucza w override.
 */

import { ReactNode } from 'react';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Główna struktura contentu strony - normalized tree
 */
export type PageContent = {
  version: string;
  rootId: string;
  nodes: Record<string, BlockNode>;
};

/**
 * Pojedynczy node w drzewie bloków
 */
export type BlockNode = {
  id: string;
  type: string;
  parentId: string | null;
  childIds: string[];
  props: BlockProps;
  meta?: BlockMeta;
};

/**
 * Props bloku - content, style, advanced
 */
export type BlockProps = {
  content: Record<string, unknown>;
  style: BlockStyle;
  advanced?: Record<string, unknown>;
};

/**
 * Style bloku z responsive overrides
 * 
 * WAŻNE: Dziedziczenie = brak klucza w responsive[breakpoint]
 * Jeśli klucz istnieje = override
 * Jeśli klucz nie istnieje = dziedziczony z base
 */
export type BlockStyle = {
  base: Record<string, unknown>;
  responsive?: {
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
};

/**
 * Metadane bloku
 */
export type BlockMeta = {
  locked?: boolean;   // locked → brak DnD, delete, paste INTO
  hidden?: boolean;
  label?: string;
};

// =============================================================================
// BLOCK DEFINITION (Registry)
// =============================================================================

/**
 * Definicja bloku w registry
 */
export type BlockDefinition = {
  type: string;
  title: string;
  description?: string;
  icon: ReactNode;
  category: BlockCategory;
  defaultProps: BlockProps;
  
  // Composition rules
  canHaveChildren?: boolean;
  allowedChildren?: string[] | ((childType: string) => boolean);
  allowedParents?: string[] | ((parentType: string) => boolean);
  
  // Special flags
  isCanvasOnly?: boolean;  // nie pokazuj w BlockBrowser (np. root)
  isItemNode?: boolean;    // TabItem, AccordionItem, Slide
  
  // Slots (dla advanced blocks)
  slots?: SlotDefinition[];
  
  // Component do renderowania
  component: React.ComponentType<BlockComponentProps>;
  
  // Schema dla properties panel
  propsSchema?: BlockPropsSchema;
};

export type BlockCategory = 
  | 'layout' 
  | 'typography' 
  | 'media' 
  | 'components' 
  | 'advanced' 
  | 'internal';

export type SlotDefinition = {
  name: string;
  allowedChildren?: string[];
};

export type BlockComponentProps = {
  node: BlockNode;
  children?: ReactNode;
  isSelected?: boolean;
  isPreview?: boolean;
};

export type BlockPropsSchema = {
  content?: Record<string, PropFieldSchema>;
  style?: Record<string, PropFieldSchema>;
  advanced?: Record<string, PropFieldSchema>;
};

export type PropFieldSchema = {
  type: 'text' | 'number' | 'select' | 'color' | 'spacing' | 'rich-text' | 'image' | 'link' | 'boolean';
  label: string;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
};

// =============================================================================
// HISTORY & COMMITS
// =============================================================================

export type CommitReason = 
  | 'dnd'       // drag & drop zakończony
  | 'blur'      // blur inputa (po debounce)
  | 'apply'     // "Apply" w properties panel
  | 'delete'    // usunięcie bloku
  | 'paste'     // wklejenie bloku
  | 'shortcut'  // keyboard shortcut (Alt+Up/Down)
  | 'add';      // dodanie nowego bloku

export type HistoryState = {
  past: PageContent[];
  future: PageContent[];
};

// =============================================================================
// DRAG & DROP
// =============================================================================

export type DragData = 
  | { dragType: 'new-block'; blockType: string }
  | { dragType: 'existing-node'; nodeId: string };

export type DropZoneData = {
  parentId: string;
  slotName: string;
  index?: number;
};

// =============================================================================
// UI STATE
// =============================================================================

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export type EditorMode = 'edit' | 'preview';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// =============================================================================
// CLIPBOARD
// =============================================================================

export type ClipboardData = {
  nodes: Record<string, BlockNode>;
  rootId: string;
};

// =============================================================================
// VALIDATION
// =============================================================================

export type ValidationError = {
  type: 
    | 'missing_root'
    | 'invalid_child'
    | 'missing_child'
    | 'parentId_mismatch'
    | 'composition_rule'
    | 'cycle'
    | 'orphan';
  nodeId?: string;
  childId?: string;
  message: string;
};

// =============================================================================
// BLOCK TEMPLATES (Faza 5)
// =============================================================================

export type BlockTemplate = {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  nodes: Record<string, BlockNode>;
  rootId: string;
};

// =============================================================================
// HELPER TYPES
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Empty content z root node
 */
export function createEmptyContent(): PageContent {
  const rootId = crypto.randomUUID();
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
