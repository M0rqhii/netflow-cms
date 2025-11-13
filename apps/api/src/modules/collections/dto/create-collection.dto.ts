import { z } from 'zod';

/**
 * CreateCollectionDto - DTO dla tworzenia kolekcji
 * AI Note: Używaj z @repo/schemas dla shared validation
 */
export const CreateCollectionDtoSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  schemaJson: z.record(z.any()),
});

export type CreateCollectionDto = z.infer<typeof CreateCollectionDtoSchema>;

