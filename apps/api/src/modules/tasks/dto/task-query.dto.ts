import { z } from 'zod';

/**
 * Task Query DTO
 * AI Note: Validates task query parameters
 */
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  contentEntryId: z.string().uuid().optional(),
  collectionItemId: z.string().uuid().optional(),
  sort: z.string().optional(), // e.g. "-createdAt,priority"
});

export type TaskQueryDto = z.infer<typeof taskQuerySchema>;




