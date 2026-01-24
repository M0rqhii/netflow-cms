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
  collectionId: z.string().uuid().optional(), // Optional - if null, webhook is global for site
  retryCount: z.number().int().positive().max(10).default(3),
  timeout: z.number().int().positive().max(30000).default(5000),
});

export type CreateWebhookDto = z.infer<typeof createWebhookSchema>;

