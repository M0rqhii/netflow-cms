import { z } from 'zod';

/**
 * UpdateDistributionDraftDto - DTO dla aktualizacji draftu
 */
export const UpdateDistributionDraftDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.any()).optional(),
  channels: z.array(z.enum(['site', 'facebook', 'twitter', 'linkedin', 'instagram', 'ads'])).optional(),
  status: z.enum(['draft', 'ready', 'published', 'archived']).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export type UpdateDistributionDraftDto = z.infer<typeof UpdateDistributionDraftDtoSchema>;

