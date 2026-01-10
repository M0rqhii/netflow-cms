import { z } from 'zod';

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  capabilityKeys: z.array(z.string()).min(1).optional(),
});

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;





