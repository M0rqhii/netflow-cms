import { z } from 'zod';
import {
  CreatePageSchema,
  UpdatePageSchema,
  PublishPageSchema,
  PageSchema,
  UpdatePageContentSchema,
} from '@repo/schemas';

export const CreatePageDtoSchema = CreatePageSchema;
export type CreatePageDto = z.infer<typeof CreatePageSchema>;

export const UpdatePageDtoSchema = UpdatePageSchema;
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;

export const PublishPageDtoSchema = PublishPageSchema;
export type PublishPageDto = z.infer<typeof PublishPageSchema>;

// Define schemas locally to avoid runtime import issues
const EnvironmentTypeSchema = z.enum(['draft', 'production']);
const PageStatusSchema = z.enum(['draft', 'published', 'archived']);

// Define PageQuerySchema locally to avoid runtime import issues
export const PageQueryDtoSchema = z.object({
  environmentId: z.string().uuid().optional(),
  environmentType: EnvironmentTypeSchema.optional(),
  status: PageStatusSchema.optional(),
});
export type PageQueryDto = z.infer<typeof PageQueryDtoSchema>;

export const PageDtoSchema = PageSchema;
export type PageDto = z.infer<typeof PageSchema>;

export const UpdatePageContentDtoSchema = UpdatePageContentSchema;
export type UpdatePageContentDto = z.infer<typeof UpdatePageContentSchema>;
