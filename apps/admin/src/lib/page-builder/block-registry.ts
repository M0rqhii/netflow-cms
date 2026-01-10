/**
 * Block Registry
 * 
 * Centralne miejsce rejestracji bloków z regułami kompozycji.
 * Każdy blok definiuje allowedChildren/allowedParents.
 */

import type { BlockDefinition, BlockCategory } from './types';

// =============================================================================
// REGISTRY CLASS
// =============================================================================

class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();
  
  /**
   * Rejestruje nową definicję bloku.
   */
  registerBlock(definition: BlockDefinition): void {
    if (this.blocks.has(definition.type)) {
      console.warn(`Block type "${definition.type}" is already registered. Overwriting.`);
    }
    this.blocks.set(definition.type, definition);
  }
  
  /**
   * Rejestruje wiele bloków naraz.
   */
  registerBlocks(definitions: BlockDefinition[]): void {
    for (const definition of definitions) {
      this.registerBlock(definition);
    }
  }
  
  /**
   * Zwraca definicję bloku lub undefined.
   */
  getBlock(type: string): BlockDefinition | undefined {
    return this.blocks.get(type);
  }
  
  /**
   * Zwraca wszystkie zarejestrowane bloki.
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }
  
  /**
   * Zwraca bloki dla danej kategorii.
   */
  getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
    return this.getAllBlocks().filter(b => b.category === category);
  }
  
  /**
   * Zwraca bloki widoczne w BlockBrowser (bez isCanvasOnly).
   */
  getBrowsableBlocks(): BlockDefinition[] {
    return this.getAllBlocks().filter(b => !b.isCanvasOnly && !b.isItemNode);
  }
  
  // ===========================================================================
  // COMPOSITION RULES
  // ===========================================================================
  
  /**
   * Sprawdza czy childType może być dzieckiem parentType.
   * Używane przy drag & drop i paste.
   * 
   * @example
   * canAddChild('column', 'heading') // true
   * canAddChild('root', 'heading')   // false (root accepts only section)
   */
  canAddChild(parentType: string, childType: string): boolean {
    const parentDef = this.blocks.get(parentType);
    const childDef = this.blocks.get(childType);
    
    // Unknown types - reject
    if (!parentDef || !childDef) {
      return false;
    }
    
    // Parent must allow children
    if (!parentDef.canHaveChildren) {
      return false;
    }
    
    // Check parent's allowedChildren
    if (parentDef.allowedChildren) {
      if (typeof parentDef.allowedChildren === 'function') {
        if (!parentDef.allowedChildren(childType)) {
          return false;
        }
      } else if (!parentDef.allowedChildren.includes(childType)) {
        return false;
      }
    }
    
    // Check child's allowedParents
    if (childDef.allowedParents) {
      if (typeof childDef.allowedParents === 'function') {
        if (!childDef.allowedParents(parentType)) {
          return false;
        }
      } else if (!childDef.allowedParents.includes(parentType)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Zwraca listę typów dozwolonych jako dzieci.
   */
  getAllowedChildren(parentType: string): string[] {
    const parentDef = this.blocks.get(parentType);
    
    if (!parentDef?.canHaveChildren) {
      return [];
    }
    
    if (!parentDef.allowedChildren) {
      // If no restriction, allow all browsable blocks
      return this.getBrowsableBlocks().map(b => b.type);
    }
    
    if (typeof parentDef.allowedChildren === 'function') {
      // Filter all blocks through the function
      const checkFn = parentDef.allowedChildren;
      return this.getAllBlocks()
        .filter(b => checkFn(b.type))
        .map(b => b.type);
    }
    
    return parentDef.allowedChildren;
  }
  
  /**
   * Zwraca listę typów dozwolonych jako rodzice.
   */
  getAllowedParents(childType: string): string[] {
    const childDef = this.blocks.get(childType);
    
    if (!childDef) {
      return [];
    }
    
    if (!childDef.allowedParents) {
      // If no restriction, allow all blocks that can have children
      return this.getAllBlocks()
        .filter(b => b.canHaveChildren && this.canAddChild(b.type, childType))
        .map(b => b.type);
    }
    
    if (typeof childDef.allowedParents === 'function') {
      const checkFn = childDef.allowedParents;
      return this.getAllBlocks()
        .filter(b => checkFn(b.type))
        .map(b => b.type);
    }
    
    return childDef.allowedParents;
  }
  
  /**
   * Zwraca human-readable error message dla invalid drop.
   */
  getCompositionErrorMessage(parentType: string, childType: string): string {
    const allowed = this.getAllowedChildren(parentType);
    
    if (allowed.length === 0) {
      return `${parentType} cannot have children`;
    }
    
    const allowedNames = allowed
      .map(t => this.blocks.get(t)?.title ?? t)
      .slice(0, 5)
      .join(', ');
    
    const suffix = allowed.length > 5 ? `, and ${allowed.length - 5} more` : '';
    
    return `Cannot add ${childType} here. Allowed: ${allowedNames}${suffix}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const blockRegistry = new BlockRegistry();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Shorthand dla blockRegistry.registerBlock
 */
export function registerBlock(definition: BlockDefinition): void {
  blockRegistry.registerBlock(definition);
}

/**
 * Shorthand dla blockRegistry.getBlock
 */
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return blockRegistry.getBlock(type);
}

/**
 * Shorthand dla blockRegistry.canAddChild
 */
export function canAddChild(parentType: string, childType: string): boolean {
  return blockRegistry.canAddChild(parentType, childType);
}
