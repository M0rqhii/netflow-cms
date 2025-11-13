/**
 * Application constants
 * AI Note: Centralizuj tutaj wszystkie stałe używane w aplikacji
 */

// API Routes
export const API_PREFIX = '/api/v1';

// Cache TTL (seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  COLLECTION: 30,
  DEFAULT: 300, // 5 minutes (default)
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Collection Item Status
export const ITEM_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

// Tenant Plans
export const TENANT_PLANS = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;






