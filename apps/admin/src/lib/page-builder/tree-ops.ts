/**
 * Tree Operations - Transaction-Safe
 * 
 * Wszystkie operacje gwarantują spójność parentId/childIds.
 * NIGDY nie modyfikuj drzewa bezpośrednio - używaj tych funkcji.
 */

import type { 
  PageContent, 
  BlockNode, 
  ValidationError,
  BlockProps 
} from './types';

// =============================================================================
// ID GENERATION - JEDNO ŹRÓDŁO PRAWDY
// =============================================================================

/**
 * Generuje unikalny ID dla node'a.
 * 
 * ⚠️ ZASADA: ZAKAZ ręcznego generowania ID poza createNodeId()
 * - Zapobiega kolizjom
 * - Jednolite testy
 * - Nie ma bugów w copy/paste
 */
export function createNodeId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// INSERT NODE
// =============================================================================

/**
 * Wstawia node do drzewa w określonym miejscu.
 * Atomowo aktualizuje parentId node'a i childIds parenta.
 */
export function insertNode(
  content: PageContent,
  parentId: string,
  index: number,
  node: BlockNode
): PageContent {
  // Validate
  const parent = content.nodes[parentId];
  if (!parent) {
    throw new Error(`Parent node "${parentId}" not found`);
  }
  
  // Validate index
  const safeIndex = Math.max(0, Math.min(index, parent.childIds.length));
  
  // Clone nodes
  const newNodes = { ...content.nodes };
  
  // Update parent's childIds
  const newParent = { ...parent };
  const newChildIds = [...newParent.childIds];
  newChildIds.splice(safeIndex, 0, node.id);
  newParent.childIds = newChildIds;
  newNodes[parentId] = newParent;
  
  // Add node with correct parentId
  newNodes[node.id] = { ...node, parentId };
  
  return { ...content, nodes: newNodes };
}

// =============================================================================
// MOVE NODE
// =============================================================================

/**
 * Przenosi node do nowego parenta lub zmienia pozycję w tym samym.
 * Atomowo aktualizuje oba parenty i parentId node'a.
 */
export function moveNode(
  content: PageContent,
  nodeId: string,
  newParentId: string,
  newIndex: number
): PageContent {
  const node = content.nodes[nodeId];
  if (!node) {
    throw new Error(`Node "${nodeId}" not found`);
  }
  
  const oldParentId = node.parentId;
  if (!oldParentId) {
    throw new Error(`Cannot move root node`);
  }
  
  const oldParent = content.nodes[oldParentId];
  const newParent = content.nodes[newParentId];
  
  if (!oldParent) {
    throw new Error(`Old parent "${oldParentId}" not found`);
  }
  if (!newParent) {
    throw new Error(`New parent "${newParentId}" not found`);
  }
  
  // Clone nodes
  const newNodes = { ...content.nodes };
  
  // Remove from old parent
  const updatedOldParent = { ...oldParent };
  updatedOldParent.childIds = oldParent.childIds.filter(id => id !== nodeId);
  newNodes[oldParentId] = updatedOldParent;
  
  // Calculate correct index (account for removal if same parent)
  let adjustedIndex = newIndex;
  if (oldParentId === newParentId) {
    const oldIndex = oldParent.childIds.indexOf(nodeId);
    if (oldIndex !== -1 && oldIndex < newIndex) {
      adjustedIndex = newIndex - 1;
    }
  }
  
  // Add to new parent
  const updatedNewParent = oldParentId === newParentId 
    ? newNodes[newParentId] 
    : { ...newParent };
  const newChildIds = [...updatedNewParent.childIds];
  const safeIndex = Math.max(0, Math.min(adjustedIndex, newChildIds.length));
  newChildIds.splice(safeIndex, 0, nodeId);
  updatedNewParent.childIds = newChildIds;
  newNodes[newParentId] = updatedNewParent;
  
  // Update node's parentId
  newNodes[nodeId] = { ...node, parentId: newParentId };
  
  return { ...content, nodes: newNodes };
}

// =============================================================================
// REMOVE NODE
// =============================================================================

/**
 * Usuwa node z drzewa (wraz z subtree).
 */
export function removeNode(
  content: PageContent,
  nodeId: string,
  options: { removeSubtree?: boolean } = { removeSubtree: true }
): PageContent {
  const node = content.nodes[nodeId];
  if (!node) {
    throw new Error(`Node "${nodeId}" not found`);
  }
  
  if (!node.parentId) {
    throw new Error(`Cannot remove root node`);
  }
  
  const parent = content.nodes[node.parentId];
  if (!parent) {
    throw new Error(`Parent "${node.parentId}" not found`);
  }
  
  // Collect all nodes to remove
  const nodesToRemove = new Set<string>();
  
  if (options.removeSubtree) {
    // DFS to collect all descendants
    const collectSubtree = (id: string) => {
      nodesToRemove.add(id);
      const n = content.nodes[id];
      if (n) {
        for (const childId of n.childIds) {
          collectSubtree(childId);
        }
      }
    };
    collectSubtree(nodeId);
  } else {
    nodesToRemove.add(nodeId);
  }
  
  // Clone nodes, excluding removed ones
  const newNodes: Record<string, BlockNode> = {};
  for (const [id, n] of Object.entries(content.nodes)) {
    if (!nodesToRemove.has(id)) {
      newNodes[id] = n;
    }
  }
  
  // Update parent's childIds
  const updatedParent = { ...parent };
  updatedParent.childIds = parent.childIds.filter(id => id !== nodeId);
  newNodes[node.parentId] = updatedParent;
  
  return { ...content, nodes: newNodes };
}

// =============================================================================
// CLONE SUBTREE
// =============================================================================

/**
 * Klonuje subtree z nowymi ID.
 * Używane przez copy/paste.
 */
export function cloneSubtree(
  content: PageContent,
  nodeId: string
): { newRootId: string; nodes: Record<string, BlockNode> } {
  const node = content.nodes[nodeId];
  if (!node) {
    throw new Error(`Node "${nodeId}" not found`);
  }
  
  // Map old IDs to new IDs
  const idMap = new Map<string, string>();
  
  // First pass: generate new IDs
  const collectIds = (id: string) => {
    idMap.set(id, createNodeId());
    const n = content.nodes[id];
    if (n) {
      for (const childId of n.childIds) {
        collectIds(childId);
      }
    }
  };
  collectIds(nodeId);
  
  // Second pass: clone nodes with new IDs
  const nodes: Record<string, BlockNode> = {};
  
  const cloneNode = (id: string, newParentId: string | null) => {
    const original = content.nodes[id];
    if (!original) return;
    
    const newId = idMap.get(id)!;
    const newChildIds = original.childIds.map(cid => idMap.get(cid)!);
    
    nodes[newId] = {
      ...original,
      id: newId,
      parentId: newParentId,
      childIds: newChildIds,
      props: structuredClone(original.props),
      meta: original.meta ? { ...original.meta } : undefined,
    };
    
    // Clone children
    for (const childId of original.childIds) {
      cloneNode(childId, newId);
    }
  };
  
  cloneNode(nodeId, null);
  
  return {
    newRootId: idMap.get(nodeId)!,
    nodes,
  };
}

// =============================================================================
// UPDATE NODE PROPS
// =============================================================================

/**
 * Aktualizuje props node'a (shallow merge).
 */
export function updateNodeProps(
  content: PageContent,
  nodeId: string,
  propsUpdate: Partial<BlockProps>
): PageContent {
  const node = content.nodes[nodeId];
  if (!node) {
    throw new Error(`Node "${nodeId}" not found`);
  }
  
  const newNodes = { ...content.nodes };
  newNodes[nodeId] = {
    ...node,
    props: {
      content: { ...node.props.content, ...propsUpdate.content },
      style: propsUpdate.style 
        ? { ...node.props.style, ...propsUpdate.style }
        : node.props.style,
      advanced: propsUpdate.advanced
        ? { ...node.props.advanced, ...propsUpdate.advanced }
        : node.props.advanced,
    },
  };
  
  return { ...content, nodes: newNodes };
}

// =============================================================================
// UPDATE NODE META
// =============================================================================

/**
 * Aktualizuje meta node'a.
 */
export function updateNodeMeta(
  content: PageContent,
  nodeId: string,
  metaUpdate: Partial<BlockNode['meta']>
): PageContent {
  const node = content.nodes[nodeId];
  if (!node) {
    throw new Error(`Node "${nodeId}" not found`);
  }
  
  const newNodes = { ...content.nodes };
  newNodes[nodeId] = {
    ...node,
    meta: { ...node.meta, ...metaUpdate },
  };
  
  return { ...content, nodes: newNodes };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Waliduje spójność drzewa (dev mode).
 */
export function validateTree(content: PageContent): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // 1. Root must exist
  if (!content.nodes[content.rootId]) {
    errors.push({ 
      type: 'missing_root', 
      message: 'Root node not found' 
    });
    return errors;
  }
  
  // 2. Check all nodes
  const reachable = new Set<string>();
  
  const traverse = (nodeId: string) => {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    
    const node = content.nodes[nodeId];
    if (!node) return;
    
    for (const childId of node.childIds) {
      const child = content.nodes[childId];
      
      if (!child) {
        errors.push({
          type: 'missing_child',
          nodeId,
          childId,
          message: `Child "${childId}" not found in nodes`,
        });
        continue;
      }
      
      if (child.parentId !== nodeId) {
        errors.push({
          type: 'parentId_mismatch',
          nodeId,
          childId,
          message: `Child "${childId}" has parentId "${child.parentId}", expected "${nodeId}"`,
        });
      }
      
      traverse(childId);
    }
  };
  
  traverse(content.rootId);
  
  // 3. Check for orphans
  for (const id of Object.keys(content.nodes)) {
    if (!reachable.has(id)) {
      errors.push({
        type: 'orphan',
        nodeId: id,
        message: `Node "${id}" is not reachable from root`,
      });
    }
  }
  
  // 4. Check for cycles (should be caught by reachable check, but explicit)
  const visited = new Set<string>();
  const stack = new Set<string>();
  
  const hasCycle = (nodeId: string): boolean => {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    stack.add(nodeId);
    
    const node = content.nodes[nodeId];
    if (node) {
      for (const childId of node.childIds) {
        if (hasCycle(childId)) return true;
      }
    }
    
    stack.delete(nodeId);
    return false;
  };
  
  if (hasCycle(content.rootId)) {
    errors.push({
      type: 'cycle',
      message: 'Tree contains cycle',
    });
  }
  
  return errors;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Znajduje wszystkich przodków node'a (od parent do root).
 */
export function getAncestors(content: PageContent, nodeId: string): string[] {
  const ancestors: string[] = [];
  let current = content.nodes[nodeId];
  
  while (current?.parentId) {
    ancestors.push(current.parentId);
    current = content.nodes[current.parentId];
  }
  
  return ancestors;
}

/**
 * Sprawdza czy node jest przodkiem innego.
 */
export function isAncestor(
  content: PageContent, 
  ancestorId: string, 
  nodeId: string
): boolean {
  return getAncestors(content, nodeId).includes(ancestorId);
}

/**
 * Znajduje następnego/poprzedniego siblinga.
 */
export function getSiblings(
  content: PageContent,
  nodeId: string
): { prev: string | null; next: string | null } {
  const node = content.nodes[nodeId];
  if (!node?.parentId) return { prev: null, next: null };
  
  const parent = content.nodes[node.parentId];
  if (!parent) return { prev: null, next: null };
  
  const index = parent.childIds.indexOf(nodeId);
  return {
    prev: index > 0 ? parent.childIds[index - 1] : null,
    next: index < parent.childIds.length - 1 ? parent.childIds[index + 1] : null,
  };
}

/**
 * Przesuwa node w górę/dół wśród siblings.
 */
export function moveNodeInSiblings(
  content: PageContent,
  nodeId: string,
  direction: 'up' | 'down'
): PageContent {
  const node = content.nodes[nodeId];
  if (!node?.parentId) return content;
  
  const parent = content.nodes[node.parentId];
  if (!parent) return content;
  
  const currentIndex = parent.childIds.indexOf(nodeId);
  if (currentIndex === -1) return content;
  
  const newIndex = direction === 'up' 
    ? currentIndex - 1 
    : currentIndex + 1;
  
  if (newIndex < 0 || newIndex >= parent.childIds.length) {
    return content;
  }
  
  // Swap positions
  const newChildIds = [...parent.childIds];
  [newChildIds[currentIndex], newChildIds[newIndex]] = 
    [newChildIds[newIndex], newChildIds[currentIndex]];
  
  const newNodes = { ...content.nodes };
  newNodes[node.parentId] = { ...parent, childIds: newChildIds };
  
  return { ...content, nodes: newNodes };
}
