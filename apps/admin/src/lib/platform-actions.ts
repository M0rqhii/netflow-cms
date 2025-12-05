'use client';

import { createApiClient, type TenantInfo } from '@repo/sdk';
import type { CreateTenant } from '@repo/schemas';
import {
  fetchMyTenants,
  createTenant as createTenantRequest,
  fetchTenantUsers,
  fetchTenantInvites,
  inviteUser as inviteUserRequest,
  revokeInvite as revokeInviteRequest,
  getBillingInfo as getBillingInfoRequest,
  updateBillingInfo as updateBillingInfoRequest,
  getAccount as getAccountRequest,
  updateAccount as updateAccountRequest,
  fetchActivity as fetchActivityFeed,
  fetchQuickStats as fetchQuickStatsRequest,
  type InviteSummary,
  type UserSummary,
  type ActivityItem,
  type QuickStats,
  getAuthToken,
} from '@/lib/api';

export type { TenantInfo } from '@repo/sdk';
export type { InviteSummary, UserSummary, ActivityItem, QuickStats } from '@/lib/api';

export type BillingInfo = Awaited<ReturnType<typeof getBillingInfoRequest>>;
export type AccountDetails = Awaited<ReturnType<typeof getAccountRequest>>;

type TenantIdentifier = string | TenantInfo;

const apiClient = createApiClient();

async function resolveTenant(identifier: TenantIdentifier, sitesCache?: TenantInfo[]): Promise<TenantInfo> {
  if (typeof identifier !== 'string') return identifier;

  const sites = sitesCache ?? (await fetchMyTenants());
  const byId = sites.find((site) => site.tenantId === identifier);
  if (byId) return byId;

  const bySlug = sites.find((site) => site.tenant.slug === identifier);
  if (bySlug) return bySlug;

  const token = getAuthToken();
  if (token) {
    try {
      const resolved = await apiClient.resolveTenant(token, identifier);
      return { tenantId: resolved.id, role: 'viewer', tenant: resolved };
    } catch {
      // fallback handled below
    }
  }

  throw new Error('Site not found or unavailable for current user.');
}

export async function getSites(): Promise<TenantInfo[]> {
  return fetchMyTenants();
}

export async function createSite(data: Pick<CreateTenant, 'name' | 'slug'> & Partial<CreateTenant>) {
  return createTenantRequest({
    name: data.name,
    slug: data.slug,
    ...(data.plan ? { plan: data.plan } : {}),
    ...(data.settings ? { settings: data.settings } : {}),
  });
}

export async function getSiteUsers(identifier: TenantIdentifier, sitesCache?: TenantInfo[]): Promise<UserSummary[]> {
  const tenant = await resolveTenant(identifier, sitesCache);
  return fetchTenantUsers(tenant.tenantId);
}

export async function getSiteInvites(identifier: TenantIdentifier, sitesCache?: TenantInfo[]): Promise<InviteSummary[]> {
  const tenant = await resolveTenant(identifier, sitesCache);
  return fetchTenantInvites(tenant.tenantId);
}

export async function inviteUserToSite(
  identifier: TenantIdentifier,
  payload: { email: string; role: string },
  sitesCache?: TenantInfo[]
): Promise<InviteSummary> {
  const tenant = await resolveTenant(identifier, sitesCache);
  return inviteUserRequest(tenant.tenantId, payload);
}

export async function removeSiteInvite(identifier: TenantIdentifier, inviteId: string, sitesCache?: TenantInfo[]): Promise<void> {
  const tenant = await resolveTenant(identifier, sitesCache);
  return revokeInviteRequest(tenant.tenantId, inviteId);
}

export async function getAccountDetails(): Promise<AccountDetails> {
  return getAccountRequest();
}

export async function updateAccountDetails(data: Parameters<typeof updateAccountRequest>[0]) {
  return updateAccountRequest(data);
}

export async function getBillingDetails(): Promise<BillingInfo> {
  return getBillingInfoRequest();
}

export async function updateBillingDetails(data: Parameters<typeof updateBillingInfoRequest>[0]) {
  return updateBillingInfoRequest(data);
}

export async function getPlatformActivity(limit?: number): Promise<ActivityItem[]> {
  const feed = await fetchActivityFeed(limit);
  return feed.map((item) => ({
    ...item,
    message: item.message || item.description || '',
  }));
}

export async function getPlatformQuickStats(): Promise<QuickStats> {
  return fetchQuickStatsRequest();
}
