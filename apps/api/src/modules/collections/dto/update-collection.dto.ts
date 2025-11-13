import { CreateCollectionDtoSchema } from './create-collection.dto';
import { z } from 'zod';

/**
 * UpdateCollectionDto - DTO dla aktualizacji kolekcji
 */
export const UpdateCollectionDtoSchema = CreateCollectionDtoSchema.partial();

export type UpdateCollectionDto = z.infer<typeof UpdateCollectionDtoSchema>;

