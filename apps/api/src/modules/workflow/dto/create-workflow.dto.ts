import { z } from 'zod';

/**
 * Workflow State Schema
 */
export const workflowStateSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  initial: z.boolean().default(false),
  final: z.boolean().default(false),
});

/**
 * Workflow Transition Schema
 */
export const workflowTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1),
  conditions: z.array(z.string()).optional(),
  requiredRoles: z.array(z.string()).optional(),
});

/**
 * Create Workflow DTO
 * AI Note: Validates workflow creation request
 */
export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  states: z.array(workflowStateSchema).min(1, 'At least one state is required'),
  transitions: z.array(workflowTransitionSchema).min(1, 'At least one transition is required'),
  contentTypeSlug: z.string().optional(), // Optional: bind to content type
});

export type CreateWorkflowDto = z.infer<typeof createWorkflowSchema>;
export type WorkflowState = z.infer<typeof workflowStateSchema>;
export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;

