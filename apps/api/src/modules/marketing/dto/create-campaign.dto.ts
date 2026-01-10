import { z } from 'zod';

/**
 * CreateCampaignDto - DTO dla tworzenia kampanii marketingowej
 */
export const CreateCampaignDtoSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignDtoSchema>;





