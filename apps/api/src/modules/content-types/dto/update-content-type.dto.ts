import { ContentTypeFieldSchema } from './create-content-type.dto';
import { z } from 'zod';

/**
 * UpdateContentTypeDto - DTO dla aktualizacji content type
 */
export const UpdateContentTypeDtoSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  fields: z.array(ContentTypeFieldSchema).optional(),
  schema: z.record(z.any()).optional(),
}).refine(
  (data) => {
    // If both fields and schema are provided, that's invalid
    if (data.fields && data.schema) {
      return false;
    }
    // At least one field should be provided
    return !!(data.name || data.slug || data.fields || data.schema);
  },
  {
    message: 'At least one field (name, slug, fields, or schema) must be provided, and fields and schema cannot be provided together',
  }
);

export type UpdateContentTypeDto = z.infer<typeof UpdateContentTypeDtoSchema>;

