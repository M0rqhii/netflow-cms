import { z } from 'zod';
import { CreateTenantSchema } from '@repo/schemas';

/**
 * CreateTenantDto - DTO dla tworzenia tenantów
 * AI Note: Uses shared schema from @repo/schemas
 */
export const CreateTenantDtoSchema = CreateTenantSchema;
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;


