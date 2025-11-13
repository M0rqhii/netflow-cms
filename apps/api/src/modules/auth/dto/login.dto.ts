import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantId: z.string().uuid('Invalid tenant ID').optional(), // Optional for global login
});

export type LoginDto = z.infer<typeof loginSchema>;


