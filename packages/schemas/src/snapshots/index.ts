import { z } from 'zod';

export const SiteSnapshotSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  label: z.string(),
  data: z.unknown(),
  createdAt: z.date(),
});

export const CreateSnapshotSchema = z.object({
  label: z.string().min(1).max(200).optional(),
});

export type SiteSnapshot = z.infer<typeof SiteSnapshotSchema>;
export type CreateSnapshot = z.infer<typeof CreateSnapshotSchema>;
