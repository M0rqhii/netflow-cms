import { z } from 'zod';

/**
 * Review Content DTO
 * AI Note: Validates review request for content entries
 */
export const reviewContentSchema = z.object({
  status: z.enum(['approved', 'rejected', 'changes_requested'], {
    errorMap: () => ({ message: 'Status must be approved, rejected, or changes_requested' }),
  }),
  comment: z.string().optional(),
});

export type ReviewContentDto = z.infer<typeof reviewContentSchema>;

