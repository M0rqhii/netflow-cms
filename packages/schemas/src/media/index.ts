import { z } from 'zod';

export const MediaItemSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  fileName: z.string(),
  path: z.string(),
  url: z.string().url(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  alt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  uploadedById: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MediaListResponseSchema = z.object({
  items: z.array(MediaItemSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type MediaItem = z.infer<typeof MediaItemSchema>;
