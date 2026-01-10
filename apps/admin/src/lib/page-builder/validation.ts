/**
 * Page Builder Validation (Zod)
 * 
 * Schema walidacji dla PageContent.
 * Używane na backendzie: parse → migrate → sanitize → validate Zod → validateComposition
 */

import { z } from 'zod';
import type { PageContent, BlockNode, ValidationError } from './types';
import { blockRegistry } from './block-registry';
import { sanitizeHtml } from './sanitize';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema dla BlockStyle
 */
export const BlockStyleSchema = z.object({
  base: z.record(z.unknown()),
  responsive: z.object({
    tablet: z.record(z.unknown()).optional(),
    mobile: z.record(z.unknown()).optional(),
  }).optional(),
});

/**
 * Schema dla BlockProps
 */
export const BlockPropsSchema = z.object({
  content: z.record(z.unknown()),
  style: BlockStyleSchema,
  advanced: z.record(z.unknown()).optional(),
});

/**
 * Schema dla BlockMeta
 */
export const BlockMetaSchema = z.object({
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  label: z.string().optional(),
}).optional();

/**
 * Schema dla BlockNode
 */
export const BlockNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  parentId: z.string().uuid().nullable(),
  childIds: z.array(z.string().uuid()),
  props: BlockPropsSchema,
  meta: BlockMetaSchema,
});

/**
 * Schema dla PageContent
 */
export const PageContentSchema = z.object({
  version: z.string(),
  rootId: z.string().uuid(),
  nodes: z.record(z.string().uuid(), BlockNodeSchema),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Waliduje PageContent z Zod
 */
export function validatePageContent(content: unknown): {
  success: boolean;
  data?: PageContent;
  errors?: z.ZodError;
} {
  const result = PageContentSchema.safeParse(content);
  
  if (result.success) {
    return { success: true, data: result.data as PageContent };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Waliduje reguły kompozycji (allowedChildren/allowedParents)
 */
export function validateComposition(content: PageContent): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const [nodeId, node] of Object.entries(content.nodes)) {
    // Skip root
    if (!node.parentId) continue;
    
    const parent = content.nodes[node.parentId];
    if (!parent) {
      errors.push({
        type: 'missing_child',
        nodeId,
        message: `Node "${nodeId}" has parentId "${node.parentId}" but parent doesn't exist`,
      });
      continue;
    }
    
    // Check composition rules
    if (!blockRegistry.canAddChild(parent.type, node.type)) {
      errors.push({
        type: 'composition_rule',
        nodeId,
        message: blockRegistry.getCompositionErrorMessage(parent.type, node.type),
      });
    }
  }
  
  return errors;
}

/**
 * Sanityzuje HTML w content props
 */
export function sanitizeContentProps(content: PageContent): PageContent {
  const sanitizedNodes: Record<string, BlockNode> = {};
  
  for (const [nodeId, node] of Object.entries(content.nodes)) {
    const sanitizedContent = { ...node.props.content };
    
    // Sanitize known HTML fields
    if (typeof sanitizedContent.html === 'string') {
      sanitizedContent.html = sanitizeHtml(sanitizedContent.html);
    }
    if (typeof sanitizedContent.text === 'string' && sanitizedContent.text.includes('<')) {
      sanitizedContent.text = sanitizeHtml(sanitizedContent.text);
    }
    
    sanitizedNodes[nodeId] = {
      ...node,
      props: {
        ...node.props,
        content: sanitizedContent,
      },
    };
  }
  
  return {
    ...content,
    nodes: sanitizedNodes,
  };
}

/**
 * Pełna walidacja backend pipeline
 */
export function validateAndSanitize(content: unknown): {
  success: boolean;
  data?: PageContent;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 1. Zod validation
  const zodResult = validatePageContent(content);
  if (!zodResult.success || !zodResult.data) {
    return {
      success: false,
      errors: zodResult.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`) || ['Invalid content structure'],
    };
  }
  
  let validContent = zodResult.data;
  
  // 2. Sanitize HTML
  validContent = sanitizeContentProps(validContent);
  
  // 3. Validate composition rules
  const compositionErrors = validateComposition(validContent);
  if (compositionErrors.length > 0) {
    errors.push(...compositionErrors.map(e => e.message));
  }
  
  // Return with warnings (composition errors are not fatal)
  return {
    success: true,
    data: validContent,
    errors,
  };
}
