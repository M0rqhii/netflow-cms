import { z } from 'zod';

/**
 * CreateSiteDto - DTO for creating a new site
 * AI Note: Validates site creation request
 */
export const CreateSiteDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  settings: z.record(z.unknown()).optional(),
});

export type CreateSiteDto = z.infer<typeof CreateSiteDtoSchema>;
