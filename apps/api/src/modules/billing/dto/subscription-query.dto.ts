import { z } from 'zod';

/**
 * SubscriptionQueryDto - DTO dla query parametrów subskrypcji
 */
export const SubscriptionQueryDtoSchema = z.object({
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).optional(),
  plan: z.enum(['free', 'pro', 'max', 'enterprise']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type SubscriptionQueryDto = z.infer<typeof SubscriptionQueryDtoSchema>;










