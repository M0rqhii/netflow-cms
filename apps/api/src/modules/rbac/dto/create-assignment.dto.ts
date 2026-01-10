import { z } from 'zod';

export const createAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  siteId: z.string().uuid().optional().nullable(),
});

export type CreateAssignmentDto = z.infer<typeof createAssignmentSchema>;





