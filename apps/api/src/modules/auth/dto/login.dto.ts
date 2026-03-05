import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgId: z.string().uuid('Invalid organization ID').optional(), // Optional for global login
});

export type LoginDto = z.infer<typeof loginSchema>;

export const loginTwoFactorSchema = z.object({
  token: z.string().uuid('Invalid two-factor token'),
  code: z
    .string()
    .min(4, 'Verification code is required')
    .max(64, 'Verification code is too long'),
});

export type LoginTwoFactorDto = z.infer<typeof loginTwoFactorSchema>;


