'use client';

import { ApiClient, createApiClient, TenantInfo } from '@repo/sdk';
import type { CreateTenant } from '@repo/schemas';

const client: ApiClient = createApiClient();

type JwtPayload = {
  exp?: number;
  email?: string;
  [key: string]: unknown;
};

function decodeJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = typeof atob === 'function' ? atob(padded) : '';
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeAuthToken(token: string | null): JwtPayload | null {
  return decodeJwtPayload(token);
}

export function getAuthTokenExpiry(token?: string | null): number | null {
  const payload = decodeJwtPayload(token ?? null);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isTokenExpired(token: string | null): boolean {
  const exp = getAuthTokenExpiry(token);
  if (exp === null) return false;
  return Date.now() >= exp;
}

function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const expires = getAuthTokenExpiry(token);
  const cookieParts = [`authToken=${token}`, 'Path=/', 'SameSite=Lax'];
  if (expires) cookieParts.push(`Expires=${new Date(expires).toUTCString()}`);
  document.cookie = cookieParts.join('; ');
}

function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearAuthTokens();
    return null;
  }
  return token;
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  setAuthCookie(token);
}

export function setTenantToken(tenantId: string, token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`tenantToken:${tenantId}`, token);
}

export function getTenantToken(tenantId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`tenantToken:${tenantId}`);
}

/**
 * Clear all authentication tokens (global and tenant-scoped)
 * Used when user logs out or when 401 Unauthorized is received
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      if (k === 'authToken' || k.startsWith('tenantToken:')) {
        localStorage.removeItem(k);
      }
    });
  } catch (error) {
    // Silently fail - localStorage might not be available (SSR)
    // Error is non-critical, no need to log or show to user
  } finally {
    clearAuthCookie();
  }
}

export function logout(redirectTo: string = '/login'): void {
  clearAuthTokens();
  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo);
  }
}

/**
 * Handle API errors, especially 401 Unauthorized
 * Clears tokens and redirects to login if unauthorized
 */
function handleApiError(response: Response, errorText?: string): never {
  if (response.status === 401) {
    // Clear all tokens on 401
    clearAuthTokens();
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized. Please login again.');
  }
  
  const message = errorText || response.statusText || `HTTP ${response.status}`;
  throw new Error(`API Error: ${response.status} ${message}`);
}

export async function fetchMyTenants(): Promise<TenantInfo[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  
  try {
    return await client.getMyTenants(token);
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error && error.message.includes('NetworkError')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      throw new Error(`Cannot connect to backend API at ${apiUrl}. Make sure backend is running and NEXT_PUBLIC_API_URL is set correctly.`);
    }
    throw error;
  }
}

export async function exchangeTenantToken(tenantId: string): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const res = await client.issueTenantToken(token, tenantId);
  setTenantToken(tenantId, res.access_token);
  return res.access_token;
}

async function ensureTenantToken(tenantId: string): Promise<string> {
  const cached = getTenantToken(tenantId);
  if (cached) return cached;
  return exchangeTenantToken(tenantId);
}

// Activity & Stats
export type ActivityItem = { id: string; type?: string; message: string; description?: string; createdAt: string };
export type QuickStats = { tenants: number; collections: number; media: number; users: number; active?: number; total?: number };

export async function fetchActivity(limit?: number): Promise<ActivityItem[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const query = typeof limit === 'number' ? `?limit=${limit}` : '';
  const res = await fetch(`${baseUrl}/activity${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch activity: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data.map((item: any, index: number): ActivityItem => ({
    id: String(item?.id ?? item?._id ?? index),
    type: item?.type,
    createdAt: item?.createdAt ?? item?.timestamp ?? new Date().toISOString(),
    description: item?.description ?? item?.message ?? '',
    message: item?.message ?? item?.description ?? '',
  }));
}

export async function fetchQuickStats(): Promise<QuickStats> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/stats/quick`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch stats: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const raw: any = await res.json().catch(() => ({}));
  const stats: QuickStats = {
    tenants: raw?.tenants ?? raw?.sites ?? 0,
    collections: raw?.collections ?? 0,
    media: raw?.media ?? 0,
    users: raw?.users ?? 0,
    active: raw?.active ?? raw?.tenants ?? raw?.sites,
    total: raw?.total ?? raw?.tenants ?? raw?.sites,
  };
  return stats;
}

export async function fetchTenantStats(tenantId: string): Promise<{ collections: number; media: number }> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/stats/tenant`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch tenant stats: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

// Tenants
export async function createTenant(payload: Pick<CreateTenant, 'name' | 'slug'> & Partial<CreateTenant>): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Collections
export type CollectionSummary = { id: string; slug: string; name: string; createdAt: string; updatedAt: string };
export async function fetchTenantCollections(tenantId: string): Promise<CollectionSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch collections: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getCollection(tenantId: string, slug: string): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createCollection(tenantId: string, payload: { name: string; slug: string; schemaJson?: Record<string, unknown> }): Promise<CollectionSummary> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateCollection(tenantId: string, slug: string, payload: { name?: string; schemaJson?: Record<string, unknown> }): Promise<CollectionSummary> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteCollection(tenantId: string, slug: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Collection Items
export type CollectionItem = { id: string; collectionId: string; data: Record<string, unknown>; status: 'DRAFT' | 'PUBLISHED'; version: number; createdAt: string; updatedAt: string };
export async function fetchCollectionItems(tenantId: string, collectionSlug: string, query?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: CollectionItem[]; total: number; page: number; pageSize: number }> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));
  if (query?.status) params.append('status', query.status);
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch collection items: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getCollectionItem(tenantId: string, collectionSlug: string, itemId: string): Promise<CollectionItem> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createCollectionItem(tenantId: string, collectionSlug: string, payload: { data: Record<string, unknown>; status?: 'DRAFT' | 'PUBLISHED' }): Promise<CollectionItem> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateCollectionItem(tenantId: string, collectionSlug: string, itemId: string, payload: { data?: Record<string, unknown>; status?: 'DRAFT' | 'PUBLISHED' }): Promise<CollectionItem> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteCollectionItem(tenantId: string, collectionSlug: string, itemId: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Content Types
export type TypeSummary = { id: string; name: string; slug: string; createdAt: string; updatedAt: string };
export async function fetchTenantTypes(tenantId: string): Promise<TypeSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to fetch content types: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getContentType(tenantId: string, id: string): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createType(tenantId: string, payload: { name: string; slug: string; fields?: unknown[]; schema?: Record<string, unknown> }): Promise<TypeSummary> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteType(tenantId: string, id: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

export async function updateType(tenantId: string, id: string, payload: { name?: string; slug?: string; fields?: unknown[]; schema?: Record<string, unknown> }): Promise<TypeSummary> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Content Entries
export type ContentEntry = { id: string; tenantId: string; contentTypeId: string; data: Record<string, unknown>; status: string; createdAt: string; updatedAt: string };
export async function fetchContentEntries(tenantId: string, contentTypeSlug: string, query?: { page?: number; pageSize?: number; status?: string; search?: string }): Promise<{ entries: ContentEntry[]; total: number; page: number; pageSize: number }> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));
  if (query?.status) params.append('status', query.status);
  if (query?.search) params.append('search', query.search);
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch content entries: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json();
  // API returns { entries: [...], total, page, pageSize } or just array
  return Array.isArray(data) ? { entries: data, total: data.length, page: 1, pageSize: data.length } : data;
}

export async function getContentEntry(tenantId: string, contentTypeSlug: string, entryId: string): Promise<ContentEntry> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createContentEntry(tenantId: string, contentTypeSlug: string, payload: { data: Record<string, unknown>; status?: string }): Promise<ContentEntry> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateContentEntry(tenantId: string, contentTypeSlug: string, entryId: string, payload: { data?: Record<string, unknown>; status?: string }): Promise<ContentEntry> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteContentEntry(tenantId: string, contentTypeSlug: string, entryId: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Content Workflow (Review & Comments)
export async function submitContentForReview(tenantId: string, contentTypeSlug: string, entryId: string): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to submit for review: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function reviewContent(tenantId: string, contentTypeSlug: string, entryId: string, status: 'approved' | 'rejected' | 'changes_requested', comment?: string): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, comment }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to review content: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getContentReviewHistory(tenantId: string, contentTypeSlug: string, entryId: string): Promise<any[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/reviews`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch review history: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createContentComment(tenantId: string, contentTypeSlug: string, entryId: string, content: string): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getContentComments(tenantId: string, contentTypeSlug: string, entryId: string, includeResolved: boolean = false): Promise<any[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments?includeResolved=${includeResolved}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch comments: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function updateContentComment(tenantId: string, contentTypeSlug: string, entryId: string, commentId: string, updates: { content?: string; resolved?: boolean }): Promise<any> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function deleteContentComment(tenantId: string, contentTypeSlug: string, entryId: string, commentId: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
}

// Media
export type MediaItem = { id: string; filename: string; url: string; mime: string; size: number; uploadedAt: string; thumbnailUrl?: string; alt?: string; metadata?: Record<string, unknown> };
export async function fetchTenantMedia(tenantId: string): Promise<MediaItem[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch media: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json();
  // API returns { items: MediaItem[], pagination: {...} }
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
  // Map API fields to MediaItem type (mimeType -> mime, createdAt -> uploadedAt)
  return items.map((item: any) => ({
    ...item,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  }));
}

export async function uploadTenantMedia(tenantId: string, file: File): Promise<MediaItem> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  const item = await res.json();
  return {
    ...item,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  };
}

export async function updateMediaItem(tenantId: string, id: string, payload: { alt?: string; metadata?: Record<string, unknown> }): Promise<MediaItem> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  const item = await res.json();
  return {
    ...item,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  };
}

export async function deleteMediaItem(tenantId: string, id: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Users
export type UserSummary = { id: string; email: string; role: string; createdAt: string };
export async function fetchTenantUsers(tenantId: string): Promise<UserSummary[]> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    // If tenant token exchange fails, try global token
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Handle 401 specifically
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export type InviteSummary = { id: string; email: string; role: string; createdAt: string; expiresAt: string };
export async function fetchTenantInvites(tenantId: string): Promise<InviteSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch invites: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function inviteUser(tenantId: string, payload: { email: string; role: string }): Promise<InviteSummary> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function inviteUserToTenant(email: string, role: string, tenantId: string): Promise<InviteSummary> {
  return inviteUser(tenantId, { email, role });
}

// Tasks
export type Task = {
  id: string;
  tenantId: string;
  contentEntryId?: string;
  collectionItemId?: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedToName?: string;
  createdById: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchTenantTasks(
  tenantId: string,
  filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    contentEntryId?: string;
    collectionItemId?: string;
  }
): Promise<Task[]> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId);
  if (filters?.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
  if (filters?.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
  if (filters?.contentEntryId) params.append('contentEntryId', filters.contentEntryId);
  if (filters?.collectionItemId) params.append('collectionItemId', filters.collectionItemId);
  
  const res = await fetch(`${baseUrl}/tasks?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function createTask(tenantId: string, payload: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  dueDate?: string;
  contentEntryId?: string;
  collectionItemId?: string;
}): Promise<Task> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to create task: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function updateTask(tenantId: string, id: string, payload: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToId: string;
  dueDate: string;
}>): Promise<Task> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  // Backend uses PUT, not PATCH
  const res = await fetch(`${baseUrl}/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to update task: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function deleteTask(tenantId: string, id: string): Promise<void> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to delete task: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
}

// Collection Roles
export type CollectionRole = {
  id: string;
  tenantId: string;
  collectionId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCollectionRoles(tenantId: string, collectionId: string): Promise<CollectionRole[]> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionId)}/roles`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to fetch collection roles: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function assignCollectionRole(tenantId: string, collectionId: string, payload: {
  userId: string;
  role: string;
}): Promise<CollectionRole> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionId)}/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to assign collection role: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function updateCollectionRole(tenantId: string, collectionId: string, userId: string, payload: {
  role: string;
}): Promise<CollectionRole> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionId)}/roles/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to update collection role: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  
  return res.json();
}

export async function removeCollectionRole(tenantId: string, collectionId: string, userId: string): Promise<void> {
  let token: string | null = null;
  try {
    token = await ensureTenantToken(tenantId);
  } catch (error) {
    token = getAuthToken();
  }
  
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionId)}/roles/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to remove collection role: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
}

export async function revokeInvite(tenantId: string, inviteId: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Billing
export type Subscription = {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  tenant?: { id: string; name: string; slug: string; plan?: string };
};

export type Invoice = {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  tenant?: { id: string; name: string; slug: string };
  subscription?: { id: string; plan: string; status: string };
};

export async function getSubscriptions(): Promise<{ subscriptions: Subscription[]; pagination: any }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getSubscriptions(token);
}

export async function getInvoices(page?: number, pageSize?: number): Promise<{ invoices: Invoice[]; pagination: any }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getInvoices(token, page, pageSize);
}

export async function getTenantSubscription(tenantId: string): Promise<Subscription | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  try {
    return await client.getTenantSubscription(token, tenantId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

export async function getTenantInvoices(tenantId: string, page?: number, pageSize?: number): Promise<{ invoices: Invoice[]; pagination: any }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getTenantInvoices(token, tenantId, page, pageSize);
}

export type SiteBillingData = {
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'none';
  renewalDate: string | null;
  invoices: Invoice[];
};

export async function getSiteBilling(siteSlug: string): Promise<SiteBillingData> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  
  // Resolve slug to tenantId
  const tenants = await fetchMyTenants();
  const tenant = tenants.find((t) => t.tenant.slug === siteSlug);
  
  if (!tenant) {
    throw new Error('Site not found');
  }
  
  const tenantId = tenant.tenantId;
  
  // Fetch subscription and invoices in parallel
  const [subscriptionData, invoicesData] = await Promise.all([
    client.getSiteBilling(token, tenantId).catch(() => null),
    client.getTenantInvoices(token, tenantId).catch(() => ({ invoices: [], pagination: { total: 0, page: 1, pageSize: 20 } })),
  ]);
  
  // Handle no subscription scenario
  if (!subscriptionData || subscriptionData.status === 'none') {
    return {
      plan: 'BASIC',
      status: 'none',
      renewalDate: null,
      invoices: invoicesData.invoices || [],
    };
  }
  
  return {
    plan: subscriptionData.plan || 'BASIC',
    status: (subscriptionData.status as 'active' | 'past_due' | 'canceled') || 'none',
    renewalDate: subscriptionData.renewalDate,
    invoices: invoicesData.invoices || [],
  };
}

// Account
export type AccountInfo = {
  id: string;
  email: string;
  role: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
  billingInfo: {
    companyName: string | null;
    nip: string | null;
    address: string | null;
  };
};

export async function getAccount(): Promise<AccountInfo> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getAccount(token);
}

export async function updateAccount(data: { name?: string; preferredLanguage?: 'pl' | 'en' }): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.updateAccount(token, data);
}

export async function changePassword(data: { oldPassword: string; newPassword: string }): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.changePassword(token, data);
}

export async function getBillingInfo(): Promise<{ companyName: string | null; nip: string | null; address: string | null }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getBillingInfo(token);
}

export async function updateBillingInfo(data: { companyName?: string; nip?: string; address?: string }): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.updateBillingInfo(token, data);
}

// Dev endpoints (non-production)
export async function getDevSummary(): Promise<{
  profile: string;
  sites: number;
  users: number;
  emails: number;
  subscriptions: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevSummary(token);
}

export async function getDevSites(): Promise<Array<{ id: string; name: string; slug: string; plan: string; createdAt?: string }>> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevSites(token);
}

export async function getDevEmails(): Promise<Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; createdAt?: string }>> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevEmails(token);
}

export async function getDevPayments(): Promise<
  Array<{ id: string; tenantId: string; plan: string; status: string; currentPeriodStart?: string; currentPeriodEnd?: string; createdAt?: string }>
> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevPayments(token);
}

export async function getDevLogs(): Promise<any[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevLogs(token);
}

// Alias for getCurrentUser (as requested)
export async function getCurrentUser(): Promise<AccountInfo> {
  return getAccount();
}

// Alias for updateAccountPreferences (as requested)
export async function updateAccountPreferences(data: { preferredLanguage?: 'pl' | 'en' }): Promise<any> {
  return updateAccount(data);
}

export type GlobalBillingInfo = {
  userId: string;
  sites: Array<{
    siteId: string;
    siteName: string;
    siteSlug: string;
    plan: string;
    status: string;
    renewalDate: string | null;
    role: string;
  }>;
  totalSites: number;
  subscriptions: Subscription[];
  invoices: Invoice[];
};

export async function getGlobalBillingInfo(): Promise<GlobalBillingInfo> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getMyBillingInfo(token);
}

