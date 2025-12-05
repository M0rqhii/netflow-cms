import { z } from 'zod';

/**
 * Create Comment DTO
 * AI Note: Validates comment creation request
 */
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment too long'),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;

