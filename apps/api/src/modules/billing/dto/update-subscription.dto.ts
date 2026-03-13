import { z } from 'zod';

/**
 * UpdateSubscriptionDto - DTO dla aktualizacji subskrypcji
 */
export const UpdateSubscriptionDtoSchema = z.object({
  plan: z.enum(['free', 'pro', 'max', 'enterprise']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionDtoSchema>;










