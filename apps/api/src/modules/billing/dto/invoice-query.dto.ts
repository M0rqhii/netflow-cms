import { z } from 'zod';

/**
 * InvoiceQueryDto - DTO dla query parametrów faktur
 */
export const InvoiceQueryDtoSchema = z.object({
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).optional(),
  subscriptionId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type InvoiceQueryDto = z.infer<typeof InvoiceQueryDtoSchema>;

