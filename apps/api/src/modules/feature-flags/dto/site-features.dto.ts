import { z } from 'zod';

export const SiteFeaturesResponseSchema = z.object({
  plan: z.string(),
  planFeatures: z.array(z.string()),
  overrides: z.array(z.object({
    featureKey: z.string(),
    enabled: z.boolean(),
    createdAt: z.date(),
  })),
  effective: z.array(z.string()),
});

export type SiteFeaturesResponse = z.infer<typeof SiteFeaturesResponseSchema>;









