import { z } from 'zod';
import { isValidFeatureKey } from '@repo/schemas';

export const FeatureOverrideDtoSchema = z.object({
  featureKey: z.string().refine(
    (key) => isValidFeatureKey(key),
    { message: 'Invalid feature key' }
  ),
  enabled: z.boolean(),
});

export type FeatureOverrideDto = z.infer<typeof FeatureOverrideDtoSchema>;





