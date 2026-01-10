/**
 * Page Builder Library Export
 */

// Types (main type definitions)
export * from './types';

// Tree operations
export * from './tree-ops';

// Style utilities
export * from './style-utils';

// Block registry
export * from './block-registry';

// Sanitization
export * from './sanitize';

// Migrations
export * from './migrations';

// DnD utilities (selectively export to avoid conflicts with types.ts)
export {
  isNewBlockDrag,
  isExistingNodeDrag,
  getDraggedType,
  validateDrop,
  calculateInsertIndex,
  calculateInsertIndexHorizontal,
  calculateInsertionLinePosition,
  findNearestValidDropTarget,
} from './dnd-utils';

// Validation (selectively export to avoid conflicts)
export { BlockNodeSchema, PageContentSchema, validateAndSanitize } from './validation';
