import { z } from 'zod';

/**
 * DistributionDraftQueryDto - DTO dla query parametrów draftów
 */
export const DistributionDraftQueryDtoSchema = z.object({
  siteId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  status: z.enum(['draft', 'ready', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type DistributionDraftQueryDto = z.infer<typeof DistributionDraftQueryDtoSchema>;





