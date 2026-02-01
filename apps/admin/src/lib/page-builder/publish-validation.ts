import { blockRegistry } from './block-registry';
import type { PageContent } from './types';

export type PublishValidationError = {
  type: 'missing_alt' | 'module_disabled';
  nodeId: string;
  message: string;
  moduleKey?: string;
};

export type PublishValidationResult = {
  valid: boolean;
  errors: PublishValidationError[];
};

export function validatePublish(content: PageContent, enabledModules: string[]): PublishValidationResult {
  const errors: PublishValidationError[] = [];
  const enabledSet = new Set(enabledModules);

  for (const node of Object.values(content.nodes)) {
    const definition = blockRegistry.getBlock(node.type);

    if (definition?.moduleKey && !enabledSet.has(definition.moduleKey)) {
      errors.push({
        type: 'module_disabled',
        nodeId: node.id,
        moduleKey: definition.moduleKey,
        message: `Block ${definition.title} requires module ${definition.moduleKey}.`,
      });
    }

    if (node.type === 'image') {
      const src = (node.props.content?.src as string | undefined) || '';
      const alt = (node.props.content?.alt as string | undefined) || '';
      if (src.trim().length > 0 && alt.trim().length === 0) {
        errors.push({
          type: 'missing_alt',
          nodeId: node.id,
          message: 'Image blocks require alt text before publishing.',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
