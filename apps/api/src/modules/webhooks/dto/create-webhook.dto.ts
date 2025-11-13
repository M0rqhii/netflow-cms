import { z } from 'zod';

/**
 * Create Webhook DTO
 * AI Note: Validates webhook creation request
 */
export const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL format'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  active: z.boolean().default(true),
  description: z.string().optional(),
});

export type CreateWebhookDto = z.infer<typeof createWebhookSchema>;

