import { z } from 'zod';

/**
 * Update Collection Role DTO
 * AI Note: Validates collection role update with granular permissions
 */
export const updateCollectionRoleSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']).optional(), // Backward compatibility
  // Granular permissions
  canRead: z.boolean().optional(),
  canWrite: z.boolean().optional(),
  canPublish: z.boolean().optional(),
  canDelete: z.boolean().optional(),
});

export type UpdateCollectionRoleDto = z.infer<typeof updateCollectionRoleSchema>;

