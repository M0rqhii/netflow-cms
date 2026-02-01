'use client';

import { ApiClient, createApiClient, SiteInfo } from '@repo/sdk';
import type { CapabilityKey, CapabilityModule, RbacCapability } from '@repo/schemas';

const client: ApiClient = createApiClient();

type JwtPayload = {
  exp?: number;
  email?: string;
  role?: string; // role (super_admin, org_admin, editor, viewer)
  platformRole?: string; // platform role (platform_admin, org_owner, user)
  systemRole?: string; // system role (super_admin, system_admin, system_dev, system_support)
  isSuperAdmin?: boolean; // flag for super admin
  sub?: string; // user id
  siteId?: string;
  orgId?: string; // organization id
  [key: string]: unknown;
};


type CreateSitePayload = {
  name: string;
  slug: string;
  plan?: string;
  settings?: Record<string, unknown>;
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

export function setSiteToken(siteId: string, token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`siteToken:${siteId}`, token);
}

export function getSiteToken(siteId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`siteToken:${siteId}`);
}

export function setOrgToken(orgId: string, token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`orgToken:${orgId}`, token);
}

export function getOrgToken(orgId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`orgToken:${orgId}`);
}

// Legacy aliases moved to end of file for consistency

/**
 * Clear all authentication tokens (global and site-scoped)
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
      if (k === 'authToken' || k.startsWith('siteToken:') || k.startsWith('orgToken:')) {
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

export async function fetchMySites(): Promise<SiteInfo[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  
  try {
    return await client.getMySites(token);
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error && error.message.includes('NetworkError')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      throw new Error(`Cannot connect to backend API at ${apiUrl}. Make sure backend is running and NEXT_PUBLIC_API_URL is set correctly.`);
    }
    throw error;
  }
}

export async function exchangeSiteToken(siteId: string): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const res = await client.issueSiteToken(token, siteId);
  setSiteToken(siteId, res.access_token);
  return res.access_token;
}

export async function exchangeOrgToken(orgId: string): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const res = await client.issueOrgToken(token, orgId);
  setOrgToken(orgId, res.access_token);
  return res.access_token;
}

async function ensureSiteToken(siteId: string): Promise<string> {
  const cached = getSiteToken(siteId);
  if (cached) return cached;
  return exchangeSiteToken(siteId);
}

async function ensureOrgToken(orgId: string): Promise<string> {
  const cached = getOrgToken(orgId);
  if (cached) return cached;
  return exchangeOrgToken(orgId);
}


// Activity & Stats
export type ActivityItem = { id: string; type?: string; message: string; description?: string; createdAt: string };

type ActivityApiItem = {
  id?: string;
  _id?: string;
  type?: string;
  createdAt?: string;
  timestamp?: string;
  description?: string;
  message?: string;
};

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};
export type QuickStats = { sites: number; collections: number; media: number; users: number; active?: number; total?: number };

export async function fetchActivity(limit?: number, orgId?: string, siteId?: string): Promise<ActivityItem[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (typeof limit === 'number') params.append('limit', String(limit));
  if (orgId) params.append('orgId', orgId);
  if (siteId) params.append('siteId', siteId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${baseUrl}/activity${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch activity: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data.map((item: ActivityApiItem, index: number): ActivityItem => ({
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
  const raw = (await res.json().catch(() => ({}))) as Partial<QuickStats> & Record<string, unknown>;
  const stats: QuickStats = {
    sites: raw?.sites ?? 0,
    collections: raw?.collections ?? 0,
    media: raw?.media ?? 0,
    users: raw?.users ?? 0,
    active: raw?.active ?? raw?.sites,
    total: raw?.total ?? raw?.sites,
  };
  return stats;
}

export async function fetchSiteStats(siteId: string): Promise<{ collections: number; media: number }> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/stats/site`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch site stats: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

// Sites
export async function createSite(payload: CreateSitePayload): Promise<{ slug?: string; site?: { slug?: string } }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/sites`, {
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
export type CollectionDetails = CollectionSummary & { schemaJson?: Record<string, unknown> };
export async function fetchSiteCollections(siteId: string): Promise<CollectionSummary[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch collections: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getCollection(siteId: string, slug: string): Promise<CollectionDetails> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createCollection(siteId: string, payload: { name: string; slug: string; schemaJson?: Record<string, unknown> }): Promise<CollectionSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateCollection(siteId: string, slug: string, payload: { name?: string; schemaJson?: Record<string, unknown> }): Promise<CollectionSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteCollection(siteId: string, slug: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Collection Items
export type CollectionItem = { id: string; collectionId: string; data: Record<string, unknown>; status: 'DRAFT' | 'PUBLISHED'; version: number; createdAt: string; updatedAt: string };
export async function fetchCollectionItems(siteId: string, collectionSlug: string, query?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: CollectionItem[]; total: number; page: number; pageSize: number }> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));
  if (query?.status) params.append('status', query.status);
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch collection items: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getCollectionItem(siteId: string, collectionSlug: string, itemId: string): Promise<CollectionItem> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createCollectionItem(siteId: string, collectionSlug: string, payload: { data: Record<string, unknown>; status?: 'DRAFT' | 'PUBLISHED' }): Promise<CollectionItem> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateCollectionItem(siteId: string, collectionSlug: string, itemId: string, payload: { data?: Record<string, unknown>; status?: 'DRAFT' | 'PUBLISHED' }): Promise<CollectionItem> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteCollectionItem(siteId: string, collectionSlug: string, itemId: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Content Types
export type TypeSummary = { id: string; name: string; slug: string; createdAt: string; updatedAt: string };
export async function fetchSiteTypes(siteId: string): Promise<TypeSummary[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Missing auth token. Please login.');
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
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

export async function getContentType(siteId: string, id: string): Promise<Record<string, unknown>> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createType(siteId: string, payload: { name: string; slug: string; fields?: unknown[]; schema?: Record<string, unknown> }): Promise<TypeSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteType(siteId: string, id: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

export async function updateType(siteId: string, id: string, payload: { name?: string; slug?: string; fields?: unknown[]; schema?: Record<string, unknown> }): Promise<TypeSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Content Entries
export type ContentEntry = { id: string; siteId: string; contentTypeId: string; data: Record<string, unknown>; status: string; createdAt: string; updatedAt: string };
export type ContentReviewEntry = { id: string; status: string; comment?: string; createdAt: string };
export type ContentComment = { id: string; content: string; createdAt: string; resolved?: boolean };
export async function fetchContentEntries(siteId: string, contentTypeSlug: string, query?: { page?: number; pageSize?: number; status?: string; search?: string }): Promise<{ entries: ContentEntry[]; total: number; page: number; pageSize: number }> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));
  if (query?.status) params.append('status', query.status);
  if (query?.search) params.append('search', query.search);
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch content entries: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json();
  // API returns { entries: [...], total, page, pageSize } or just array
  return Array.isArray(data) ? { entries: data, total: data.length, page: 1, pageSize: data.length } : data;
}

export async function getContentEntry(siteId: string, contentTypeSlug: string, entryId: string): Promise<ContentEntry> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createContentEntry(siteId: string, contentTypeSlug: string, payload: { data: Record<string, unknown>; status?: string }): Promise<ContentEntry> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateContentEntry(siteId: string, contentTypeSlug: string, entryId: string, payload: { data?: Record<string, unknown>; status?: string }): Promise<ContentEntry> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteContentEntry(siteId: string, contentTypeSlug: string, entryId: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Content Workflow (Review & Comments)
export async function submitContentForReview(siteId: string, contentTypeSlug: string, entryId: string): Promise<Record<string, unknown>> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to submit for review: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function reviewContent(siteId: string, contentTypeSlug: string, entryId: string, status: 'approved' | 'rejected' | 'changes_requested', comment?: string): Promise<Record<string, unknown>> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, comment }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to review content: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getContentReviewHistory(siteId: string, contentTypeSlug: string, entryId: string): Promise<ContentReviewEntry[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/reviews`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch review history: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createContentComment(siteId: string, contentTypeSlug: string, entryId: string, content: string): Promise<ContentComment> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getContentComments(siteId: string, contentTypeSlug: string, entryId: string, includeResolved: boolean = false): Promise<ContentComment[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments?includeResolved=${includeResolved}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch comments: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function updateContentComment(siteId: string, contentTypeSlug: string, entryId: string, commentId: string, updates: { content?: string; resolved?: boolean }): Promise<ContentComment> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function deleteContentComment(siteId: string, contentTypeSlug: string, entryId: string, commentId: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(entryId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete comment: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
}

// Media
export type MediaItem = { id: string; fileName: string; path?: string; url: string; mime: string; size: number; uploadedAt: string; width?: number; height?: number; thumbnailUrl?: string; alt?: string; metadata?: Record<string, unknown> };
export async function fetchSiteMedia(siteId: string): Promise<MediaItem[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch media: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data = await res.json();
  // API returns { items: MediaItem[], pagination: {...} }
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
  // Map API fields to MediaItem type (mimeType -> mime, createdAt -> uploadedAt)
  return items.map((item: MediaItem & { filename?: string; name?: string; mimeType?: string; createdAt?: string; uploadedAt?: string }) => ({
    ...item,
    fileName: item.fileName || item.filename || item.name || '',
    path: item.path,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  }));
}

export async function uploadSiteMedia(siteId: string, file: File): Promise<MediaItem> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  const item = await res.json();
  return {
    ...item,
    fileName: item.fileName || item.filename || item.name || '',
    path: item.path,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  };
}

export async function updateMediaItem(siteId: string, id: string, payload: { alt?: string; metadata?: Record<string, unknown> }): Promise<MediaItem> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  const item = await res.json();
  return {
    ...item,
    fileName: item.fileName || item.filename || item.name || '',
    path: item.path,
    mime: item.mimeType || item.mime || '',
    uploadedAt: item.createdAt || item.uploadedAt || new Date().toISOString(),
  };
}

export async function deleteMediaItem(siteId: string, id: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Users
export type UserSummary = { id: string; email: string; role: string; createdAt: string };
export async function fetchSiteUsers(siteId: string): Promise<UserSummary[]> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
  } catch (error) {
    // If site token exchange fails, try global token
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
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
export async function fetchSiteInvites(siteId: string): Promise<InviteSummary[]> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch invites: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export type InviteDetails = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  organization: { id: string; name: string; slug: string };
  site?: { id: string; name: string; slug: string } | null;
};

export async function fetchInviteDetails(token: string): Promise<InviteDetails> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/auth/invite/${encodeURIComponent(token)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to load invite: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function acceptInvite(
  token: string,
  password: string,
  preferredLanguage?: 'pl' | 'en'
): Promise<{ access_token: string; refresh_token: string; user: { id: string; email: string; role: string; orgId: string } }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/auth/invite/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, preferredLanguage }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function inviteUser(siteId: string, payload: { email: string; role: string }): Promise<InviteSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function inviteUserToSite(email: string, role: string, siteId: string): Promise<InviteSummary> {
  return inviteUser(siteId, { email, role });
}

/**
 * Create a new user directly (admin only)
 * Security: Only super_admin can create super_admin users
 */
export async function createUser(siteId: string, payload: { email: string; password: string; role: string; preferredLanguage?: 'pl' | 'en' }): Promise<UserSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

/**
 * Update user role (admin only)
 * Security: Only super_admin can assign super_admin role
 */
export async function updateUserRole(siteId: string, userId: string, role: string): Promise<UserSummary> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Platform-level user management (no site context)
export type PlatformUser = {
  id: string;
  email: string;
  role: string; // Backward compatibility
  siteRole?: string; // Site role (viewer, editor, editor-in-chief, marketing, admin, owner)
  platformRole?: string; // Platform role (user, editor-in-chief, admin, owner)
  systemRole?: string; // System role (super_admin, system_admin, system_dev, system_support)
  isSuperAdmin?: boolean; // Flaga dla super admin
  siteId: string;
  createdAt: string;
  updatedAt: string;
  site?: {
    id: string;
    name: string;
    slug: string;
  };
};

export type PlatformUsersResponse = {
  data: PlatformUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function fetchPlatformUsers(page: number = 1, pageSize: number = 20): Promise<PlatformUsersResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/platform/users?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function createPlatformUser(payload: {
  email: string;
  password: string;
  role: string;
  platformRole?: string;
  permissions?: string[];
}): Promise<PlatformUser> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/platform/users`, {
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

export async function updatePlatformUser(userId: string, payload: {
  role?: string;
  siteRole?: string;
  platformRole?: string;
  systemRole?: string;
  permissions?: string[];
}): Promise<PlatformUser> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/platform/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deletePlatformUser(userId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/platform/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Tasks
export type Task = {
  id: string;
  siteId: string;
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

export async function fetchSiteTasks(
  siteId: string,
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
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
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

export async function createTask(siteId: string, payload: {
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
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
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

export async function updateTask(siteId: string, id: string, payload: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToId: string;
  dueDate: string;
}>): Promise<Task> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
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

export async function deleteTask(siteId: string, id: string): Promise<void> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
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
  siteId: string;
  collectionId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCollectionRoles(siteId: string, collectionId: string): Promise<CollectionRole[]> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
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

export async function assignCollectionRole(siteId: string, collectionId: string, payload: {
  userId: string;
  role: string;
}): Promise<CollectionRole> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
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

export async function updateCollectionRole(siteId: string, collectionId: string, userId: string, payload: {
  role: string;
}): Promise<CollectionRole> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId, 'Content-Type': 'application/json' },
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

export async function removeCollectionRole(siteId: string, collectionId: string, userId: string): Promise<void> {
  let token: string | null = null;
  try {
    token = await ensureSiteToken(siteId);
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
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed to remove collection role: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
}

export async function revokeInvite(siteId: string, inviteId: string): Promise<void> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Billing
export type Subscription = {
  id: string;
  siteId: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  site?: { id: string; name: string; slug: string; plan?: string };
};

export type Invoice = {
  id: string;
  siteId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  site?: { id: string; name: string; slug: string };
  subscription?: { id: string; plan: string; status: string };
};

export type GlobalSubscription = {
  id: string;
  orgId: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  organization?: { id: string; name: string; slug: string };
};

export type GlobalInvoice = {
  id: string;
  orgId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  organization?: { id: string; name: string; slug: string };
  subscription?: { id: string; plan: string; status: string };
};

export async function getSubscriptions(): Promise<{ subscriptions: Subscription[]; pagination: Pagination }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getSubscriptions(token);
}

export async function getInvoices(page?: number, pageSize?: number): Promise<{ invoices: Invoice[]; pagination: Pagination }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getInvoices(token, page, pageSize);
}

export async function getSiteSubscription(siteId: string): Promise<Subscription | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  try {
    return await client.getSiteSubscription(token, siteId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

export async function getSiteInvoices(siteId: string, page?: number, pageSize?: number): Promise<{ invoices: Invoice[]; pagination: Pagination }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getSiteInvoices(token, siteId, page, pageSize);
}

export type SiteBillingData = {
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'none';
  renewalDate: string | null;
  invoices: Invoice[];
};

// SEO Settings
export type SeoSettings = {
  id: string;
  siteId: string;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSeoSettingsDto = {
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterCard?: string | null;
};

export async function getSeoSettings(siteId: string): Promise<SeoSettings> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/site-panel/${siteId}/seo`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch SEO settings: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function updateSeoSettings(siteId: string, payload: UpdateSeoSettingsDto): Promise<SeoSettings> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/site-panel/${siteId}/seo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Site-ID': siteId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update SEO settings: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getSiteBilling(siteSlug: string): Promise<SiteBillingData> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  
  // Resolve slug to siteId
  const sites = await fetchMySites();
  const site = sites.find((s) => s.site.slug === siteSlug);
  
  if (!site) {
    throw new Error('Site not found');
  }
  
  const siteId = site.siteId;
  
  // Fetch subscription and invoices in parallel
  const [subscriptionData, invoicesData] = await Promise.all([
    client.getSiteBilling(token, siteId).catch(() => null),
    client.getSiteInvoices(token, siteId).catch(() => ({ invoices: [], pagination: { total: 0, page: 1, pageSize: 20 } })),
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
  orgId?: string; // organization id
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

export async function getProfile(): Promise<{ id: string; email: string; role: string; orgId: string; preferredLanguage: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function updateAccount(data: { name?: string; preferredLanguage?: 'pl' | 'en' }): Promise<AccountInfo> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.updateAccount(token, data);
}

export async function changePassword(data: { oldPassword: string; newPassword: string }): Promise<Record<string, unknown>> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.changePassword(token, data);
}

export async function getBillingInfo(): Promise<{ companyName: string | null; nip: string | null; address: string | null }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getBillingInfo(token);
}

export async function updateBillingInfo(data: { companyName?: string; nip?: string; address?: string }): Promise<{ companyName: string | null; nip: string | null; address: string | null }> {
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
  Array<{ id: string; orgId: string; plan?: string; status: string; currentPeriodStart?: string; currentPeriodEnd?: string; createdAt?: string }>
> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevPayments(token);
}

export async function getDevLogs(): Promise<Array<{ id: string; timestamp: string; level: string; module: string; message: string; metadata?: Record<string, unknown> }>> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getDevLogs(token);
}

// Alias for getCurrentUser (as requested)
export async function getCurrentUser(): Promise<AccountInfo> {
  return getAccount();
}

// Alias for updateAccountPreferences (as requested)
export async function updateAccountPreferences(data: { preferredLanguage?: 'pl' | 'en' }): Promise<AccountInfo> {
  return updateAccount(data);
}

export type GlobalBillingInfo = {
  userId: string;
  organizations: Array<{
    orgId: string;
    orgName: string;
    orgSlug: string;
    plan: string;
    status: string;
    renewalDate: string | null;
    role: string;
  }>;
  totalOrgs: number;
  subscriptions: GlobalSubscription[];
  invoices: GlobalInvoice[];
};

export async function getGlobalBillingInfo(): Promise<GlobalBillingInfo> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  return client.getMyBillingInfo(token);
}

// RBAC (org-level)
export type RbacRole = {
  id: string;
  name: string;
  description?: string | null;
  type: 'SYSTEM' | 'CUSTOM';
  scope: 'ORG' | 'SITE';
  isImmutable: boolean;
  capabilities: Array<{
    key: CapabilityKey;
    module: CapabilityModule;
    label?: string;
    description?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type RbacPolicy = {
  id: string;
  capabilityKey: CapabilityKey;
  enabled: boolean;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RbacAssignment = {
  id: string;
  userId: string;
  roleId: string;
  siteId?: string | null;
  role: RbacRole;
  createdAt: string;
};

export type EffectivePermission = {
  key: CapabilityKey;
  allowed: boolean;
  reason?: string;
  policyEnabled?: boolean;
  roleSources?: Array<string | { name?: string; roleName?: string; id?: string }>;
};

async function getOrgAuthToken(orgId: string): Promise<string> {
  let token: string | null = null;
  try {
    token = await ensureOrgToken(orgId);
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
  return token;
}

function buildOrgHeaders(token: string, orgId: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'X-Org-ID': orgId,
    'X-Tenant-ID': orgId, // Backward compatibility
  };
}

// Org Dashboard
export type DashboardAlert = {
  id: string;
  type: 'deployment_error' | 'missing_domain' | 'limit_exceeded' | 'policy_disabled' | 'billing_issue';
  severity: 'high' | 'medium' | 'low';
  message: string;
  siteId?: string;
  siteSlug?: string;
  actionUrl: string;
};

export type DashboardSiteCard = {
  id: string;
  slug: string;
  name: string;
  status: 'LIVE' | 'DRAFT' | 'ERROR';
  domain?: string;
  plan?: string;
  lastDeploy?: {
    time: string;
    status: 'success' | 'failed';
    message?: string;
  };
  alerts?: DashboardAlert[];
  quickActions: Array<{
    label: string;
    url: string;
    capability?: string;
  }>;
};

export type DashboardBusinessInfo = {
  plan: {
    name: string;
    limits: {
      maxPages: number;
      maxUsers: number;
      maxStorageMB: number;
    };
  };
  usage: {
    storage: { used: number; limit: number; percent: number };
    apiRequests: { used: number; limit: number; percent: number };
    bandwidth: { used: number; limit: number; percent: number };
  };
  billing: {
    status: string;
    nextPayment?: string;
  };
};

export type DashboardUsageInfo = {
  storage: { used: number; limit: number; percent: number };
  apiRequests: { used: number; limit: number; percent: number };
  bandwidth: { used: number; limit: number; percent: number };
};

export type DashboardActivityItem = {
  id: string;
  type: string;
  message: string;
  time: string;
  siteId?: string;
  siteSlug?: string;
};

export type DashboardResponse = {
  alerts: DashboardAlert[];
  business?: DashboardBusinessInfo;
  usage?: DashboardUsageInfo;
  sites: DashboardSiteCard[];
  activity?: DashboardActivityItem[];
  quickAccess?: Array<{ label: string; url: string }>;
};

export async function fetchOrgDashboard(orgId: string): Promise<DashboardResponse> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/dashboard`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch dashboard: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function fetchRbacCapabilities(orgId: string): Promise<RbacCapability[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/capabilities`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch capabilities: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function fetchOrgUsers(orgId: string): Promise<UserSummary[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/users`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch org users: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function fetchRbacRoles(orgId: string, scope?: 'ORG' | 'SITE'): Promise<RbacRole[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const query = scope ? `?scope=${scope}` : '';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/roles${query}`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch roles: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createRbacRole(
  orgId: string,
  payload: { name: string; description?: string; scope: 'ORG' | 'SITE'; capabilityKeys: CapabilityKey[] },
): Promise<RbacRole> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildOrgHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateRbacRole(
  orgId: string,
  roleId: string,
  payload: { name?: string; description?: string; capabilityKeys?: CapabilityKey[] },
): Promise<RbacRole> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...buildOrgHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteRbacRole(orgId: string, roleId: string, force?: boolean): Promise<{ success: boolean }> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const query = force ? '?force=true' : '';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/roles/${encodeURIComponent(roleId)}${query}`, {
    method: 'DELETE',
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function fetchRbacPolicies(orgId: string): Promise<RbacPolicy[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/policies`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch policies: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function updateRbacPolicy(orgId: string, capabilityKey: CapabilityKey, enabled: boolean): Promise<RbacPolicy> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/policies/${encodeURIComponent(capabilityKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...buildOrgHeaders(token, orgId) },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function fetchRbacAssignments(
  orgId: string,
  params?: { userId?: string; siteId?: string | null }
): Promise<RbacAssignment[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const queryParams = new URLSearchParams();
  if (params?.userId) queryParams.set('userId', params.userId);
  if (params?.siteId !== undefined) queryParams.set('siteId', params.siteId === null ? 'null' : params.siteId);
  const query = queryParams.toString();
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/assignments${query ? `?${query}` : ''}`, {
    headers: buildOrgHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch assignments: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createRbacAssignment(
  orgId: string,
  payload: { userId: string; roleId: string; siteId?: string | null }
): Promise<RbacAssignment> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildOrgHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteRbacAssignment(orgId: string, assignmentId: string): Promise<{ success: boolean }> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(
    `${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
      headers: buildOrgHeaders(token, orgId),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function fetchRbacEffectivePermissions(
  orgId: string,
  params: { userId: string; siteId?: string | null }
): Promise<EffectivePermission[]> {
  const token = await getOrgAuthToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const queryParams = new URLSearchParams();
  queryParams.set('userId', params.userId);
  if (params.siteId !== undefined) queryParams.set('siteId', params.siteId === null ? 'null' : params.siteId);
  const res = await fetch(
    `${baseUrl}/orgs/${encodeURIComponent(orgId)}/rbac/effective?${queryParams.toString()}`,
    {
      headers: buildOrgHeaders(token, orgId),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// ============================================
// Marketing & Distribution API
// ============================================

export type MarketingCampaign = {
  id: string;
  orgId: string;
  siteId: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate?: string | null;
  endDate?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    distributionDrafts: number;
    publishJobs: number;
  };
};

export type DistributionDraft = {
  id: string;
  orgId: string;
  siteId: string;
  campaignId?: string | null;
  contentId?: string | null;
  title: string;
  content: Record<string, unknown>;
  channels: string[];
  status: 'draft' | 'ready' | 'published' | 'archived';
  scheduledAt?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    id: string;
    name: string;
  } | null;
};

export type PublishJob = {
  id: string;
  orgId: string;
  siteId: string;
  campaignId?: string | null;
  draftId?: string | null;
  channels: string[];
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  startedAt?: string | null;
  completedAt?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: {
    id: string;
    name: string;
  } | null;
  draft?: {
    id: string;
    title: string;
  } | null;
  publishResults?: Array<{
    id: string;
    channel: string;
    status: string;
    externalId?: string | null;
    url?: string | null;
    error?: string | null;
    publishedAt?: string | null;
  }>;
  _count?: {
    publishResults: number;
  };
};

export type ChannelConnection = {
  id: string;
  orgId: string;
  siteId: string;
  channel: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'ads';
  channelId?: string | null;
  channelName?: string | null;
  status: 'connected' | 'disconnected' | 'error';
  connectedById?: string | null;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
};

async function getMarketingToken(orgId: string): Promise<string> {
  return getOrgAuthToken(orgId);
}

function buildMarketingHeaders(token: string, orgId: string): HeadersInit {
  return buildOrgHeaders(token, orgId);
}

// Campaigns
export async function fetchMarketingCampaigns(
  orgId: string,
  query?: { siteId?: string; status?: string; page?: number; pageSize?: number }
): Promise<{ campaigns: MarketingCampaign[]; pagination: { total: number; page: number; pageSize: number } }> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.siteId) params.set('siteId', query.siteId);
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));
  const res = await fetch(`${baseUrl}/marketing/campaigns?${params.toString()}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getMarketingCampaign(orgId: string, campaignId: string): Promise<MarketingCampaign> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch campaign: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createMarketingCampaign(
  orgId: string,
  payload: { siteId: string; name: string; description?: string; startDate?: string; endDate?: string }
): Promise<MarketingCampaign> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateMarketingCampaign(
  orgId: string,
  campaignId: string,
  payload: { name?: string; description?: string; status?: string; startDate?: string | null; endDate?: string | null }
): Promise<MarketingCampaign> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteMarketingCampaign(orgId: string, campaignId: string): Promise<{ success: boolean }> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/campaigns/${encodeURIComponent(campaignId)}`, {
    method: 'DELETE',
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Distribution Drafts
export async function fetchDistributionDrafts(
  orgId: string,
  query?: { siteId?: string; campaignId?: string; status?: string; page?: number; pageSize?: number }
): Promise<{ drafts: DistributionDraft[]; pagination: { total: number; page: number; pageSize: number } }> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.siteId) params.set('siteId', query.siteId);
  if (query?.campaignId) params.set('campaignId', query.campaignId);
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));
  const res = await fetch(`${baseUrl}/marketing/drafts?${params.toString()}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch drafts: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getDistributionDraft(orgId: string, draftId: string): Promise<DistributionDraft> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/drafts/${encodeURIComponent(draftId)}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch draft: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createDistributionDraft(
  orgId: string,
  payload: {
    siteId: string;
    campaignId?: string;
    contentId?: string;
    title: string;
    content: Record<string, unknown>;
    channels: string[];
    scheduledAt?: string;
  }
): Promise<DistributionDraft> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function updateDistributionDraft(
  orgId: string,
  draftId: string,
  payload: {
    title?: string;
    content?: Record<string, unknown>;
    channels?: string[];
    status?: string;
    scheduledAt?: string | null;
  }
): Promise<DistributionDraft> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/drafts/${encodeURIComponent(draftId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function deleteDistributionDraft(orgId: string, draftId: string): Promise<{ success: boolean }> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/drafts/${encodeURIComponent(draftId)}`, {
    method: 'DELETE',
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Publish
export async function publishMarketingContent(
  orgId: string,
  payload: {
    siteId: string;
    campaignId?: string;
    draftId?: string;
    channels: string[];
    content?: Record<string, unknown>;
    title?: string;
  }
): Promise<PublishJob> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function fetchPublishJobs(
  orgId: string,
  query?: { siteId?: string; campaignId?: string; draftId?: string; status?: string; page?: number; pageSize?: number }
): Promise<{ jobs: PublishJob[]; pagination: { total: number; page: number; pageSize: number } }> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.siteId) params.set('siteId', query.siteId);
  if (query?.campaignId) params.set('campaignId', query.campaignId);
  if (query?.draftId) params.set('draftId', query.draftId);
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));
  const res = await fetch(`${baseUrl}/marketing/jobs?${params.toString()}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch publish jobs: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function getPublishJob(orgId: string, jobId: string): Promise<PublishJob> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/jobs/${encodeURIComponent(jobId)}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch publish job: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

// Channel Connections
export async function fetchChannelConnections(
  orgId: string,
  query?: { siteId?: string; channel?: string; status?: string }
): Promise<ChannelConnection[]> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const params = new URLSearchParams();
  if (query?.siteId) params.set('siteId', query.siteId);
  if (query?.channel) params.set('channel', query.channel);
  if (query?.status) params.set('status', query.status);
  const res = await fetch(`${baseUrl}/marketing/channels?${params.toString()}`, {
    headers: buildMarketingHeaders(token, orgId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(`Failed to fetch channel connections: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

export async function createChannelConnection(
  orgId: string,
  payload: {
    siteId: string;
    channel: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'ads';
    channelId?: string;
    channelName?: string;
    credentials?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): Promise<ChannelConnection> {
  const token = await getMarketingToken(orgId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/marketing/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildMarketingHeaders(token, orgId) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) handleApiError(res, text);
    throw new Error(text || res.statusText);
  }
  return res.json();
}



