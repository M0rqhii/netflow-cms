import { z } from 'zod';

/**
 * PublishDto - DTO dla publikacji omnichannel
 */
export const PublishDtoSchema = z.object({
  siteId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
  channels: z.array(z.enum(['site', 'facebook', 'twitter', 'linkedin', 'instagram', 'ads'])).min(1),
  // Opcjonalnie można podać content bezpośrednio (jeśli nie ma draftId)
  content: z.record(z.any()).optional(),
  title: z.string().optional(),
});

export type PublishDto = z.infer<typeof PublishDtoSchema>;

