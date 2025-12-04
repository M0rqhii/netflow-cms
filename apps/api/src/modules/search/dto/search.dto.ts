import { z } from 'zod';

/**
 * Search DTO
 * AI Note: Validates search request
 */
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  contentTypeSlug: z.string().optional(),
  collectionSlug: z.string().optional(),
  filters: z.record(z.any()).optional(), // Advanced filters: { status: 'published', dateRange: { from, to }, etc }
  facets: z.array(z.string()).optional(), // Fields to generate facets for: ['status', 'contentType', 'createdAt']
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(), // e.g. "createdAt", "-priority", "title"
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type SearchDto = z.infer<typeof searchSchema>;

