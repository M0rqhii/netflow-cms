import { z } from 'zod';
import {
  CreatePageSchema,
  UpdatePageSchema,
  PublishPageSchema,
  PageQuerySchema,
  PageSchema,
} from '@repo/schemas';

export const CreatePageDtoSchema = CreatePageSchema;
export type CreatePageDto = z.infer<typeof CreatePageSchema>;

export const UpdatePageDtoSchema = UpdatePageSchema;
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;

export const PublishPageDtoSchema = PublishPageSchema;
export type PublishPageDto = z.infer<typeof PublishPageSchema>;

export const PageQueryDtoSchema = PageQuerySchema;
export type PageQueryDto = z.infer<typeof PageQuerySchema>;

export const PageDtoSchema = PageSchema;
export type PageDto = z.infer<typeof PageSchema>;
