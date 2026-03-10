import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  orgId: z.string().uuid('Invalid organization ID').optional(),
  role: z.enum(['org_admin', 'org_member']).optional().default('org_member'),
  preferredLanguage: z.enum(['pl', 'en']).optional().default('en'),
}).refine((data) => data.orgId, {
  message: 'Organization ID is required',
  path: ['orgId'],
});

export type RegisterDto = z.infer<typeof registerSchema>;


