'use client';

import { ApiClient, createApiClient, TenantInfo } from '@repo/sdk';

const client: ApiClient = createApiClient();

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
}

export function setTenantToken(tenantId: string, token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`tenantToken:${tenantId}`, token);
}

export function getTenantToken(tenantId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`tenantToken:${tenantId}`);
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

export async function ensureTenantToken(tenantId: string): Promise<string> {
  const existing = getTenantToken(tenantId);
  if (existing) return existing;
  return exchangeTenantToken(tenantId);
}

// Placeholder real actions (wire to API when endpoints are ready)
export async function createTenant(name: string, slug: string): Promise<{ id: string; name: string; slug: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, slug }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function inviteUser(tenantId: string, email: string, role: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tenants/${encodeURIComponent(tenantId)}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Users & invitations for a tenant (placeholders, wire when backend ready)
export type UserSummary = { id: string; email: string; role: string; createdAt?: string };
export type InviteSummary = { id: string; email: string; role: string; createdAt: string };

export async function fetchTenantUsers(tenantId: string): Promise<UserSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/users`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) {
    // Fallback to empty list until endpoint exists
    return [];
  }
  return res.json();
}

export async function fetchTenantInvites(tenantId: string): Promise<InviteSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tenants/${encodeURIComponent(tenantId)}/invites`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function revokeInvite(tenantId: string, inviteId: string): Promise<void> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/tenants/${encodeURIComponent(tenantId)}/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }
}

// Activity & stats (global placeholders)
export type ActivityItem = { id: string; message: string; createdAt: string };
export type QuickStats = { tenants: number; users: number; active: number; total: number; collections?: number; media?: number };

export async function fetchActivity(limit = 5): Promise<ActivityItem[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/activity?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchQuickStats(): Promise<QuickStats | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

// Per-tenant stats (collections/media counts)
export type TenantStats = { collections: number; media: number };

export async function fetchTenantStats(tenantId: string): Promise<TenantStats | null> {
  // Aggregate from available endpoints: media stats + collections count
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const headers = { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } as Record<string, string>;
  try {
    const [mediaRes, colsRes] = await Promise.all([
      fetch(`${baseUrl}/media/stats`, { headers }),
      fetch(`${baseUrl}/collections`, { headers }),
    ]);
    const mediaJson = mediaRes.ok ? await mediaRes.json() : { total: 0 };
    const colsJson = colsRes.ok ? await colsRes.json() : [];
    return { collections: Array.isArray(colsJson) ? colsJson.length : 0, media: mediaJson?.total ?? 0 };
  } catch {
    return null;
  }
}

// Collections
export type CollectionSummary = { id: string; name: string; slug: string; itemsCount?: number; updatedAt?: string };
export async function fetchTenantCollections(tenantId: string): Promise<CollectionSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/collections`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) return [];
  return res.json();
}
export async function createCollection(tenantId: string, payload: { name: string; slug: string }) {
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
export async function deleteCollection(tenantId: string, slug: string) {
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

export async function updateCollection(tenantId: string, slug: string, payload: { name?: string; slug?: string }) {
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

// Content Types
export type TypeSummary = { id: string; name: string; slug: string; fieldsCount?: number; updatedAt?: string };
export async function fetchTenantTypes(tenantId: string): Promise<TypeSummary[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/content-types`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) return [];
  return res.json();
}
export async function createType(tenantId: string, payload: { name: string; slug: string }) {
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
export async function deleteType(tenantId: string, id: string) {
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

export async function updateType(tenantId: string, id: string, payload: { name?: string; slug?: string }) {
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

// Media
export type MediaItem = { id: string; filename: string; url: string; mime: string; size: number; uploadedAt: string; thumbnailUrl?: string };
export async function fetchTenantMedia(tenantId: string): Promise<MediaItem[]> {
  const token = await ensureTenantToken(tenantId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token. Please login.');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/media`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId },
  });
  if (!res.ok) return [];
  return res.json();
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
  return res.json();
}

/**
 * Get tenant token for a specific tenant (by tenantId)
 * Returns null if token doesn't exist
 */
export function getTenantTokenByTenantId(tenantId: string): string | null {
  return getTenantToken(tenantId);
}

/**
 * Get tenant token for a specific tenant (by slug)
 * First resolves slug to tenantId, then gets token
 */
export async function getTenantTokenBySlug(slug: string): Promise<string | null> {
  try {
    const tenants = await fetchMyTenants();
    const tenant = tenants.find((t) => t.tenant.slug === slug);
    if (!tenant) return null;
    return getTenantToken(tenant.tenantId);
  } catch {
    return null;
  }
}
