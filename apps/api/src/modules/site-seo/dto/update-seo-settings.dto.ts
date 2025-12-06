import { z } from 'zod';
import {
  SeoSettingsSchema,
  UpdateSeoSettingsDtoSchema as SharedUpdateSeoSettingsDtoSchema,
} from '@repo/schemas';

export const SeoSettingsDtoSchema = SeoSettingsSchema;
export type SeoSettingsDto = z.infer<typeof SeoSettingsSchema>;

export const UpdateSeoSettingsDtoSchema = SharedUpdateSeoSettingsDtoSchema;
export type UpdateSeoSettingsDto = z.infer<typeof SharedUpdateSeoSettingsDtoSchema>;
