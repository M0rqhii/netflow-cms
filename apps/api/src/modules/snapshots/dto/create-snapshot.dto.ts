import { z } from 'zod';

export const CreateSnapshotDtoSchema = z.object({
  label: z.string().min(1).max(200).optional(),
});

export type CreateSnapshotDto = z.infer<typeof CreateSnapshotDtoSchema>;
