import { z } from 'zod';

/**
 * Update Task DTO
 * AI Note: Validates task update request (all fields optional)
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  contentEntryId: z.string().uuid().nullable().optional(),
  collectionItemId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;




