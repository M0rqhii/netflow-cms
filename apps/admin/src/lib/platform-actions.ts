'use client';

import { createApiClient, type SiteInfo } from '@repo/sdk';
import {
  fetchMySites,
  createSite as createSiteRequest,
  fetchSiteUsers,
  fetchSiteInvites,
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

export type { SiteInfo } from '@repo/sdk';
export type { InviteSummary, UserSummary, ActivityItem, QuickStats } from '@/lib/api';

export type BillingInfo = Awaited<ReturnType<typeof getBillingInfoRequest>>;
export type AccountDetails = Awaited<ReturnType<typeof getAccountRequest>>;

type SiteIdentifier = string | SiteInfo;

const apiClient = createApiClient();

async function resolveSite(identifier: SiteIdentifier, sitesCache?: SiteInfo[]): Promise<SiteInfo> {
  if (typeof identifier !== 'string') return identifier;

  const sites = sitesCache ?? (await fetchMySites());
  const byId = sites.find((site) => site.siteId === identifier);
  if (byId) return byId;

  const bySlug = sites.find((site) => site.site.slug === identifier);
  if (bySlug) return bySlug;

  const token = getAuthToken();
  if (token) {
    try {
      const resolved = await apiClient.resolveSite(token, identifier);
      return { siteId: resolved.id, role: 'viewer', site: resolved };
    } catch {
      // fallback handled below
    }
  }

  throw new Error('Site not found or unavailable for current user.');
}

export async function getSites(): Promise<SiteInfo[]> {
  return fetchMySites();
}

export async function createSite(data: { name: string; slug: string; plan?: string; settings?: Record<string, unknown> }) {
  return createSiteRequest({
    name: data.name,
    slug: data.slug,
    ...(data.plan ? { plan: data.plan } : {}),
    ...(data.settings ? { settings: data.settings } : {}),
  });
}

export async function getSiteUsers(identifier: SiteIdentifier, sitesCache?: SiteInfo[]): Promise<UserSummary[]> {
  const site = await resolveSite(identifier, sitesCache);
  return fetchSiteUsers(site.siteId);
}

export async function getSiteInvites(identifier: SiteIdentifier, sitesCache?: SiteInfo[]): Promise<InviteSummary[]> {
  const site = await resolveSite(identifier, sitesCache);
  return fetchSiteInvites(site.siteId);
}

export async function inviteUserToSite(
  identifier: SiteIdentifier,
  payload: { email: string; role: string },
  sitesCache?: SiteInfo[]
): Promise<InviteSummary> {
  const site = await resolveSite(identifier, sitesCache);
  return inviteUserRequest(site.siteId, payload);
}

export async function removeSiteInvite(identifier: SiteIdentifier, inviteId: string, sitesCache?: SiteInfo[]): Promise<void> {
  const site = await resolveSite(identifier, sitesCache);
  return revokeInviteRequest(site.siteId, inviteId);
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
