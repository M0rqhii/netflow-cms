/**
 * Content Migrations Pipeline
 * 
 * Wersjonowanie i migracja contentu page buildera.
 * Backend: parse → migrate → sanitize → validate
 */

import type { PageContent, BlockNode } from './types';
import { createNodeId } from './tree-ops';

// =============================================================================
// VERSION
// =============================================================================

export const CURRENT_VERSION = '1.0';

// =============================================================================
// MIGRATION TYPES
// =============================================================================

type Migration = {
  fromVersion: string;
  toVersion: string;
  migrate: (content: PageContent) => PageContent;
};

// =============================================================================
// MIGRATIONS REGISTRY
// =============================================================================

const migrations: Migration[] = [
  // Example: Migration from 0.9 to 1.0
  // {
  //   fromVersion: '0.9',
  //   toVersion: '1.0',
  //   migrate: (content) => {
  //     // Migration logic
  //     return { ...content, version: '1.0' };
  //   },
  // },
];

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

/**
 * Pobiera ścieżkę migracji od wersji źródłowej do docelowej
 */
function getMigrationPath(fromVersion: string, toVersion: string): Migration[] {
  const path: Migration[] = [];
  let currentVersion = fromVersion;
  
  while (currentVersion !== toVersion) {
    const nextMigration = migrations.find(m => m.fromVersion === currentVersion);
    
    if (!nextMigration) {
      // Brak migracji - zwróć to co mamy
      break;
    }
    
    path.push(nextMigration);
    currentVersion = nextMigration.toVersion;
  }
  
  return path;
}

/**
 * Migruje content do najnowszej wersji
 */
export function migrateContent(content: PageContent): PageContent {
  if (!content.version) {
    content = { ...content, version: '0.0' };
  }
  
  if (content.version === CURRENT_VERSION) {
    return content;
  }
  
  const migrationPath = getMigrationPath(content.version, CURRENT_VERSION);
  
  let migratedContent = content;
  for (const migration of migrationPath) {
    try {
      migratedContent = migration.migrate(migratedContent);
      console.log(`[Migrations] Migrated from ${migration.fromVersion} to ${migration.toVersion}`);
    } catch (error) {
      console.error(`[Migrations] Failed to migrate from ${migration.fromVersion}:`, error);
      throw new Error(`Migration failed: ${migration.fromVersion} → ${migration.toVersion}`);
    }
  }
  
  // Ensure version is current
  return { ...migratedContent, version: CURRENT_VERSION };
}

/**
 * Sprawdza czy content wymaga migracji
 */
export function needsMigration(content: PageContent): boolean {
  return content.version !== CURRENT_VERSION;
}

/**
 * Parsuje content z JSON string
 */
export function parseContent(jsonString: string): PageContent | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Basic validation
    if (!parsed.rootId || !parsed.nodes) {
      console.error('[Migrations] Invalid content structure');
      return null;
    }
    
    return parsed as PageContent;
  } catch (error) {
    console.error('[Migrations] Failed to parse content:', error);
    return null;
  }
}

/**
 * Serializuje content do JSON string
 */
export function serializeContent(content: PageContent): string {
  return JSON.stringify(content);
}

// =============================================================================
// LEGACY CONTENT CONVERSION
// =============================================================================

/**
 * Konwertuje stary format (sections array) do normalized tree
 * Dla backward compatibility
 */
export function convertLegacyContent(legacyContent: unknown): PageContent {
  const rootId = createNodeId();
  const nodes: Record<string, BlockNode> = {
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
  };
  
  // Check if it's the old sections[] format
  if (
    legacyContent &&
    typeof legacyContent === 'object' &&
    'sections' in legacyContent &&
    Array.isArray((legacyContent as { sections: unknown[] }).sections)
  ) {
    const { sections } = legacyContent as { sections: LegacySection[] };
    
    for (const section of sections) {
      const sectionNode = convertLegacySection(section, rootId);
      nodes[sectionNode.id] = sectionNode;
      nodes[rootId].childIds.push(sectionNode.id);
      
      // Convert children recursively
      if (section.blocks) {
        for (const block of section.blocks) {
          const blockNode = convertLegacyBlock(block, sectionNode.id);
          nodes[blockNode.id] = blockNode;
          sectionNode.childIds.push(blockNode.id);
        }
      }
    }
  }
  
  return {
    version: CURRENT_VERSION,
    rootId,
    nodes,
  };
}

type LegacySection = {
  id?: string;
  type?: string;
  blocks?: LegacyBlock[];
  [key: string]: unknown;
};

type LegacyBlock = {
  id?: string;
  type?: string;
  content?: Record<string, unknown>;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

function convertLegacySection(section: LegacySection, parentId: string): BlockNode {
  return {
    id: section.id || createNodeId(),
    type: 'section',
    parentId,
    childIds: [],
    props: {
      content: {} as Record<string, unknown>,
      style: {
        base: (section.style || {}) as Record<string, unknown>,
      },
    },
  };
}

function convertLegacyBlock(block: LegacyBlock, parentId: string): BlockNode {
  return {
    id: block.id || createNodeId(),
    type: block.type || 'text',
    parentId,
    childIds: [],
    props: {
      content: block.content || {},
      style: {
        base: block.style || {},
      },
    },
  };
}

// =============================================================================
// CONTENT VALIDATION FOR MIGRATIONS
// =============================================================================

/**
 * Naprawia podstawowe problemy z contentem
 */
export function repairContent(content: PageContent): PageContent {
  const repairedNodes = { ...content.nodes };
  const orphanedIds: string[] = [];
  
  // Find orphaned nodes (no parent, not root)
  for (const [id, node] of Object.entries(repairedNodes)) {
    if (id === content.rootId) continue;
    
    if (!node.parentId || !repairedNodes[node.parentId]) {
      orphanedIds.push(id);
    }
  }
  
  // Move orphans to root
  if (orphanedIds.length > 0) {
    console.warn(`[Migrations] Found ${orphanedIds.length} orphaned nodes, moving to root`);
    
    const root = { ...repairedNodes[content.rootId] };
    root.childIds = [...root.childIds, ...orphanedIds];
    repairedNodes[content.rootId] = root;
    
    for (const id of orphanedIds) {
      repairedNodes[id] = { ...repairedNodes[id], parentId: content.rootId };
    }
  }
  
  // Clean up invalid childIds
  for (const [id, node] of Object.entries(repairedNodes)) {
    const validChildIds = node.childIds.filter(childId => repairedNodes[childId]);
    if (validChildIds.length !== node.childIds.length) {
      console.warn(`[Migrations] Cleaned invalid childIds for node ${id}`);
      repairedNodes[id] = { ...node, childIds: validChildIds };
    }
  }
  
  return {
    ...content,
    nodes: repairedNodes,
  };
}
