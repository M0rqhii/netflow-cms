import { z } from 'zod';

/**
 * CampaignQueryDto - DTO dla query parametrów kampanii
 */
export const CampaignQueryDtoSchema = z.object({
  siteId: z.string().uuid().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CampaignQueryDto = z.infer<typeof CampaignQueryDtoSchema>;

