import { z } from 'zod';

/**
 * Create Hook DTO
 * AI Note: Validates hook creation request
 */
export const createHookSchema = z.object({
  collectionId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['before', 'after', 'transform']),
  event: z.string().min(1, 'Event is required'),
  handler: z.string().min(1, 'Handler is required'),
  config: z.record(z.unknown()).optional(),
  active: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0),
});

export type CreateHookDto = z.infer<typeof createHookSchema>;
