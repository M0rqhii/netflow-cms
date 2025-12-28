import { z } from 'zod';

export const SiteEventSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  userId: z.string().nullable().optional(),
  type: z.string(),
  message: z.string(),
  metadata: z.unknown().nullable().optional(),
  createdAt: z.date(),
});

export type SiteEvent = z.infer<typeof SiteEventSchema>;
