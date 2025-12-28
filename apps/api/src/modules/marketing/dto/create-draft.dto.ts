import { z } from 'zod';

/**
 * CreateDistributionDraftDto - DTO dla tworzenia draftu publikacji
 */
export const CreateDistributionDraftDtoSchema = z.object({
  siteId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  content: z.record(z.any()), // JSON object - może zawierać różne wersje dla różnych kanałów
  channels: z.array(z.enum(['site', 'facebook', 'twitter', 'linkedin', 'instagram', 'ads'])).min(1),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateDistributionDraftDto = z.infer<typeof CreateDistributionDraftDtoSchema>;

