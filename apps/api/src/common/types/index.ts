/**
 * Shared types and interfaces
 * AI Note: Dodawaj tutaj typy używane w wielu miejscach aplikacji
 */

// Prisma JsonValue type helper
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

// Tenant context type
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
}

// Pagination response type
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}






