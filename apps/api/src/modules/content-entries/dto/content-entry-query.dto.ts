import { z } from 'zod';

/**
 * ContentEntryQueryDto - DTO dla query content entries
 */
export const ContentEntryQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sort: z.string().optional(), // e.g. "-createdAt,updatedAt"
  filter: z.record(z.any()).optional(), // Basic filter support
  search: z.string().optional(), // Full-text search (optional)
});

export type ContentEntryQueryDto = z.infer<typeof ContentEntryQueryDtoSchema>;

