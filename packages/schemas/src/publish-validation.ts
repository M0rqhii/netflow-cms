/**
 * Shared Publish Validation
 *
 * Single source of truth for page builder publish validation rules.
 * Used by both frontend (admin) and backend (api).
 */

import { getModuleForBlockType } from './builder-block-modules';

// =============================================================================
// TYPES
// =============================================================================

export type PublishValidationError = {
  type: 'missing_alt' | 'module_disabled';
  nodeId: string;
  blockType?: string;
  moduleKey?: string;
  message: string;
};

export type PublishValidationResult = {
  valid: boolean;
  errors: PublishValidationError[];
};

// =============================================================================
// TYPE GUARD
// =============================================================================

type BuilderContent = {
  rootId: string;
  nodes: Record<string, {
    id: string;
    type: string;
    props?: {
      content?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
};

function isBuilderContent(content: unknown): content is BuilderContent {
  if (!content || typeof content !== 'object') return false;
  const maybe = content as Record<string, unknown>;
  return typeof maybe.rootId === 'string'
    && typeof maybe.nodes === 'object'
    && maybe.nodes !== null;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates page builder content before publishing.
 *
 * Rules:
 * 1. Blocks requiring disabled modules cannot be published
 * 2. Image blocks must have alt text when src is provided
 *
 * @param content - PageContent or raw JSON (backend receives untyped data)
 * @param enabledModules - List of enabled module keys for the site
 */
export function validatePublishContent(
  content: unknown,
  enabledModules: string[],
): PublishValidationResult {
  if (!isBuilderContent(content)) {
    return { valid: true, errors: [] };
  }

  const errors: PublishValidationError[] = [];
  const enabledSet = new Set(enabledModules);

  for (const [nodeId, node] of Object.entries(content.nodes)) {
    const type = typeof node?.type === 'string' ? node.type : undefined;
    if (!type) continue;

    // Check module gating
    const moduleKey = getModuleForBlockType(type);
    if (moduleKey && !enabledSet.has(moduleKey)) {
      errors.push({
        type: 'module_disabled',
        nodeId,
        blockType: type,
        moduleKey,
        message: `Block "${type}" requires module "${moduleKey}".`,
      });
    }

    // Check image alt text
    if (type === 'image') {
      const contentProps = node?.props?.content ?? {};
      const src = typeof contentProps.src === 'string' ? contentProps.src : '';
      const alt = typeof contentProps.alt === 'string' ? contentProps.alt : '';
      if (src.trim().length > 0 && alt.trim().length === 0) {
        errors.push({
          type: 'missing_alt',
          nodeId,
          blockType: type,
          message: 'Image blocks require alt text before publishing.',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
