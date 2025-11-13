import { z } from 'zod';

/**
 * Upload Media DTO
 * AI Note: Validates file upload request
 */
export const uploadMediaSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().int().positive('Size must be positive'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UploadMediaDto = z.infer<typeof uploadMediaSchema>;

