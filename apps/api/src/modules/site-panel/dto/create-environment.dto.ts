import { z } from 'zod';
import { CreateSiteEnvironmentSchema, SiteEnvironmentSchema, EnvironmentTypeSchema } from '@repo/schemas';

export const CreateSiteEnvironmentDtoSchema = CreateSiteEnvironmentSchema;
export type CreateSiteEnvironmentDto = z.infer<typeof CreateSiteEnvironmentSchema>;

export const EnvironmentDtoSchema = SiteEnvironmentSchema;
export type EnvironmentDto = z.infer<typeof SiteEnvironmentSchema>;

export const EnvironmentTypeDtoSchema = EnvironmentTypeSchema;
export type EnvironmentTypeDto = z.infer<typeof EnvironmentTypeSchema>;
