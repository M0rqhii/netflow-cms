import { z } from 'zod';

/**
 * CreateSubscriptionDto - DTO dla tworzenia subskrypcji
 */
export const CreateSubscriptionDtoSchema = z.object({
  plan: z.enum(['free', 'professional', 'enterprise']),
  stripePriceId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  trialDays: z.number().int().min(0).max(30).optional(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionDtoSchema>;


