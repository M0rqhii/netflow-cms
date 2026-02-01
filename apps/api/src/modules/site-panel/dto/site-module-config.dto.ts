
import { z } from 'zod';
import { isBuilderModuleKey } from '@repo/schemas';

export const SiteModuleConfigDtoSchema = z.object({
  moduleKey: z.string().refine((key) => isBuilderModuleKey(key), { message: 'Invalid module key' }),
  config: z.record(z.unknown()).default({}),
});

export type SiteModuleConfigDto = z.infer<typeof SiteModuleConfigDtoSchema>;
