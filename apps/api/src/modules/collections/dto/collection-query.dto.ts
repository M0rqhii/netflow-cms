import { z } from 'zod';

export const CollectionQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).optional().default(50),
  sort: z.string().optional(),
});

export type CollectionQueryDto = z.infer<typeof CollectionQueryDtoSchema>;
