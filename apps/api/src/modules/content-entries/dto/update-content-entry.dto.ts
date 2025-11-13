import { z } from 'zod';

/**
 * UpdateContentEntryDto - DTO dla aktualizacji content entry
 */
export const UpdateContentEntryDtoSchema = z.object({
  data: z.record(z.any()).optional(), // Content data matching content type schema
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export type UpdateContentEntryDto = z.infer<typeof UpdateContentEntryDtoSchema>;

