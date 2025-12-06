import { z } from 'zod';

/**
 * UpdateSiteSubscriptionDto - DTO dla aktualizacji subskrypcji site
 */
export const UpdateSiteSubscriptionDtoSchema = z.object({
  plan: z.enum(['BASIC', 'PRO']).optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing']).optional(),
  renewalDate: z.string().datetime().optional(), // ISO datetime string
});

export type UpdateSiteSubscriptionDto = z.infer<typeof UpdateSiteSubscriptionDtoSchema>;


