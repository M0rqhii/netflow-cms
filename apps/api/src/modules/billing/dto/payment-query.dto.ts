import { z } from 'zod';

/**
 * PaymentQueryDto - DTO dla query parametrów płatności
 */
export const PaymentQueryDtoSchema = z.object({
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional(),
  invoiceId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PaymentQueryDto = z.infer<typeof PaymentQueryDtoSchema>;






