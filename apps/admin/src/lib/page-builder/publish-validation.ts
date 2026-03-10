/**
 * Publish Validation (Frontend)
 *
 * Re-exports shared validation from @repo/schemas.
 * Frontend-specific: also checks blockRegistry for moduleKey
 * when BLOCK_MODULE_MAP doesn't have the mapping.
 */

import { validatePublishContent } from '@repo/schemas';
import type { PublishValidationResult, PublishValidationError } from '@repo/schemas';
import { blockRegistry } from './block-registry';
import type { PageContent } from './types';

export type { PublishValidationError, PublishValidationResult };

/**
 * Frontend publish validation — uses shared rules from @repo/schemas,
 * plus blockRegistry as a secondary source for module keys.
 */
export function validatePublish(content: PageContent, enabledModules: string[]): PublishValidationResult {
  // Run shared validation (module gating via BLOCK_MODULE_MAP + missing alt)
  const result = validatePublishContent(content, enabledModules);

  // Additionally check blockRegistry for moduleKeys not in BLOCK_MODULE_MAP
  const enabledSet = new Set(enabledModules);
  const checkedNodeIds = new Set(result.errors.map((e) => e.nodeId));

  for (const node of Object.values(content.nodes)) {
    if (checkedNodeIds.has(node.id)) continue;

    const definition = blockRegistry.getBlock(node.type);
    if (definition?.moduleKey && !enabledSet.has(definition.moduleKey)) {
      result.errors.push({
        type: 'module_disabled',
        nodeId: node.id,
        blockType: node.type,
        moduleKey: definition.moduleKey,
        message: `Block "${definition.title}" requires module "${definition.moduleKey}".`,
      });
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
