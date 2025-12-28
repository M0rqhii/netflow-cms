import { z } from 'zod';

export const updatePolicySchema = z.object({
  enabled: z.boolean(),
});

export type UpdatePolicyDto = z.infer<typeof updatePolicySchema>;

