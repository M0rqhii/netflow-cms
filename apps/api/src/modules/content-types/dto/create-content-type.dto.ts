import { z } from 'zod';

/**
 * Field definition schema for content type fields
 * AI Note: Supports relations and nested objects
 */
export const ContentTypeFieldSchema: z.ZodType<any> = z.lazy(() => z.object({
  name: z.string().min(1),
  type: z.enum([
    'text',
    'number',
    'boolean',
    'date',
    'datetime',
    'richtext',
    'media',
    'relation',
    'json',
    'object', // Nested object
    'array',  // Array of values
  ]),
  required: z.boolean().default(false),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  // Relation field properties
  relationType: z.enum(['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany']).optional(),
  relatedContentTypeId: z.string().uuid().optional(),
  // Nested object properties
  fields: z.array(ContentTypeFieldSchema).optional(), // Recursive for nested objects
  // Array properties
  items: ContentTypeFieldSchema.optional(), // Schema for array items
}));

/**
 * CreateContentTypeDto - DTO dla tworzenia content type
 * AI Note: Można podać fields (array) lub schema (JSON Schema object)
 */
export const CreateContentTypeDtoSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  fields: z.array(ContentTypeFieldSchema).optional(),
  schema: z.record(z.any()).optional(),
}).refine(
  (data) => data.fields || data.schema,
  {
    message: 'Either fields or schema must be provided',
  }
);

export type CreateContentTypeDto = z.infer<typeof CreateContentTypeDtoSchema>;
export type ContentTypeField = z.infer<typeof ContentTypeFieldSchema>;





