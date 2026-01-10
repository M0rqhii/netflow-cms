import { z } from 'zod';

/**
 * UpdateCampaignDto - DTO dla aktualizacji kampanii
 */
export const UpdateCampaignDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export type UpdateCampaignDto = z.infer<typeof UpdateCampaignDtoSchema>;





