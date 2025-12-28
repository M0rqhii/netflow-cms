import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  // Security: super_admin cannot be set during registration
  // Only existing super_admin can create new super_admin users via admin endpoint
  role: z.enum(['tenant_admin', 'editor', 'viewer']).optional().default('viewer'),
  preferredLanguage: z.enum(['pl', 'en']).optional().default('en'),
});

export type RegisterDto = z.infer<typeof registerSchema>;


