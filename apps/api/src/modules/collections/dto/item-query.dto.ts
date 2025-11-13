import { z } from 'zod';

/**
 * ItemQueryDto - DTO dla query items
 */
export const ItemQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  sort: z.string().optional(), // e.g. "-createdAt,name"
  filter: z.record(z.any()).optional(), // key->value equals filter
});

export type ItemQueryDto = z.infer<typeof ItemQueryDtoSchema>;

