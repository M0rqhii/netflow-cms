import { z } from 'zod';

/**
 * Query Media DTO
 * AI Note: Validates media query parameters
 */
export const queryMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  mimeType: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'size', 'filename']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryMediaDto = z.infer<typeof queryMediaSchema>;

