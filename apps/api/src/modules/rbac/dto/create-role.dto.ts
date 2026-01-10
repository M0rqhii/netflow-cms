import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scope: z.enum(['ORG', 'SITE']),
  capabilityKeys: z.array(z.string()).min(1),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;





