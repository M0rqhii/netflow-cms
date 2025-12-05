import { z } from 'zod';

/**
 * Update Hook DTO
 * AI Note: Validates hook update request (all fields optional)
 */
export const updateHookSchema = z.object({
  collectionId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  type: z.enum(['before', 'after', 'transform']).optional(),
  event: z.string().min(1).optional(),
  handler: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export type UpdateHookDto = z.infer<typeof updateHookSchema>;
