import { z } from 'zod';

/**
 * Create Collection Role DTO
 * AI Note: Validates collection role assignment with granular permissions
 */
export const createCollectionRoleSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  role: z.enum(['viewer', 'editor', 'admin']).optional(), // Backward compatibility
  // Granular permissions
  canRead: z.boolean().optional().default(true),
  canWrite: z.boolean().optional().default(false),
  canPublish: z.boolean().optional().default(false),
  canDelete: z.boolean().optional().default(false),
});

export type CreateCollectionRoleDto = z.infer<typeof createCollectionRoleSchema>;

