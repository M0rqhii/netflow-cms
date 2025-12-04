import { z } from 'zod';
import { CreateCollectionSchema } from '@repo/schemas';

/**
 * CreateCollectionDto - DTO dla tworzenia kolekcji
 * AI Note: Uses shared schema from @repo/schemas
 */
export const CreateCollectionDtoSchema = CreateCollectionSchema;
export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;

