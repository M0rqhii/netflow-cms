import { z } from 'zod';

/**
 * Update Webhook DTO
 * AI Note: Validates webhook update request
 */
export const updateWebhookSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  events: z.array(z.string()).min(1, 'At least one event is required').optional(),
  secret: z.string().optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  retryCount: z.number().int().positive().max(10).optional(),
  timeout: z.number().int().positive().max(30000).optional(),
});

export type UpdateWebhookDto = z.infer<typeof updateWebhookSchema>;

