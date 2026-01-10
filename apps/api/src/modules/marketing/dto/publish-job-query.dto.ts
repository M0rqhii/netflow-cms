import { z } from 'zod';

/**
 * PublishJobQueryDto - DTO dla query parametrów jobów publikacji
 */
export const PublishJobQueryDtoSchema = z.object({
  siteId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'success', 'failed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PublishJobQueryDto = z.infer<typeof PublishJobQueryDtoSchema>;





