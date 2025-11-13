import { z } from 'zod';

/**
 * CreateContentEntryDto - DTO dla tworzenia content entry
 */
export const CreateContentEntryDtoSchema = z.object({
  data: z.record(z.any()), // Content data matching content type schema
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export type CreateContentEntryDto = z.infer<typeof CreateContentEntryDtoSchema>;

