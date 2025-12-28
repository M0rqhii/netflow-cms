import { z } from 'zod';

/**
 * Upload Media DTO
 * AI Note: Validates file upload request
 */
export const uploadMediaSchema = z.object({
  filename: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  size: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).optional().transform((val) => val ?? {});

export type UploadMediaDto = z.infer<typeof uploadMediaSchema>;

