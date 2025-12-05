import { z } from 'zod';

/**
 * Create Task DTO
 * AI Note: Validates task creation request
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().optional(),
  contentEntryId: z.string().uuid().optional(),
  collectionItemId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;




