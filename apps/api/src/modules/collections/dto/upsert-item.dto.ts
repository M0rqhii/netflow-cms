import { z } from 'zod';

/**
 * UpsertItemDto - DTO dla tworzenia/aktualizacji itemów
 */
export const UpsertItemDtoSchema = z.object({
  data: z.record(z.any()),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  version: z.number().int().optional(), // for optimistic concurrency
});

export type UpsertItemDto = z.infer<typeof UpsertItemDtoSchema>;

