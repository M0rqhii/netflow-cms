import { z } from 'zod';
import { TENANT_PLANS } from '../../../common/constants';

/**
 * CreateTenantDto - DTO dla tworzenia tenantów
 * AI Note: Walidacja danych przy tworzeniu nowego tenant
 */
export const CreateTenantDtoSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(255),
  slug: z
    .string()
    .min(1, 'Slug jest wymagany')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug może zawierać tylko małe litery, cyfry i myślniki'),
  plan: z.enum([TENANT_PLANS.FREE, TENANT_PLANS.PROFESSIONAL, TENANT_PLANS.ENTERPRISE]).default(TENANT_PLANS.FREE),
  settings: z.record(z.any()).optional().default({}),
});

export type CreateTenantDto = z.infer<typeof CreateTenantDtoSchema>;


