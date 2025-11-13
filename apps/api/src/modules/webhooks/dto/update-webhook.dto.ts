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
});

export type UpdateWebhookDto = z.infer<typeof updateWebhookSchema>;

