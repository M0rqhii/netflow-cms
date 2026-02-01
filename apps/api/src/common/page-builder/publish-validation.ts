import type { JsonValue } from '@repo/schemas';
import { getModuleForBlockType } from '@repo/schemas';

export type PublishValidationError = {
  type: 'missing_alt' | 'module_disabled';
  nodeId?: string;
  blockType?: string;
  moduleKey?: string;
  message: string;
};

export type PublishValidationResult = {
  valid: boolean;
  errors: PublishValidationError[];
};

function isBuilderContent(content: JsonValue | null | undefined): content is { nodes: Record<string, any>; rootId: string } {
  if (!content || typeof content !== 'object') return false;
  const maybe = content as Record<string, any>;
  return typeof maybe.rootId === 'string' && typeof maybe.nodes === 'object' && maybe.nodes !== null;
}

export function validatePageBuilderContent(content: JsonValue | null | undefined, enabledModules: string[]): PublishValidationResult {
  if (!isBuilderContent(content)) {
    return { valid: true, errors: [] };
  }

  const errors: PublishValidationError[] = [];
  const enabled = new Set(enabledModules);

  for (const [nodeId, node] of Object.entries(content.nodes)) {
    const type = typeof node?.type === 'string' ? node.type : undefined;
    if (!type) continue;

    const moduleKey = getModuleForBlockType(type);
    if (moduleKey && !enabled.has(moduleKey)) {
      errors.push({
        type: 'module_disabled',
        nodeId,
        blockType: type,
        moduleKey,
        message: `Block ${type} requires module ${moduleKey}.`,
      });
    }

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
