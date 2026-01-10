import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgId: z.string().uuid('Invalid organization ID').optional(), // Optional for global login
  tenantId: z.string().uuid('Invalid tenant ID').optional(), // DEPRECATED: Backward compatibility - use orgId instead
});

export type LoginDto = z.infer<typeof loginSchema>;


