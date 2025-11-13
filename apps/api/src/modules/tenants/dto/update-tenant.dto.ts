import { CreateTenantDtoSchema } from './create-tenant.dto';
import { z } from 'zod';

/**
 * UpdateTenantDto - DTO dla aktualizacji tenantów
 * AI Note: Wszystkie pola są opcjonalne
 */
export const UpdateTenantDtoSchema = CreateTenantDtoSchema.partial();

export type UpdateTenantDto = z.infer<typeof UpdateTenantDtoSchema>;


