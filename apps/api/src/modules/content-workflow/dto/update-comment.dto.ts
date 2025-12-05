import { z } from 'zod';

/**
 * Update Comment DTO
 * AI Note: Validates comment update request
 */
export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment too long').optional(),
  resolved: z.boolean().optional(),
});

export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;

