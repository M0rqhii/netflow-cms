import { ApiClient, MediaItem } from '../index';

// Lazy initialization to avoid "can't access lexical declaration before initialization" error
let clientInstance: ApiClient | null = null;

function getClient(): ApiClient {
  if (!clientInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    clientInstance = new ApiClient(baseUrl);
  }
  return clientInstance;
}

function getAuthTokenFromStorage(): string {
  if (typeof window === 'undefined') {
    throw new Error('Auth token is required when not running in a browser');
  }
  const token = window.localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Missing auth token');
  }
  return token;
}

function resolveTokenAndSite(tokenOrSiteId: string, maybeSiteId?: string) {
  if (maybeSiteId) {
    return { token: tokenOrSiteId, siteId: maybeSiteId };
  }
  return { token: getAuthTokenFromStorage(), siteId: tokenOrSiteId };
}

// listMedia(token, siteId) or listMedia(siteId) when auth token is stored in browser
export async function listMedia(tokenOrSiteId: string, maybeSiteId?: string): Promise<MediaItem[]> {
  const { token, siteId } = resolveTokenAndSite(tokenOrSiteId, maybeSiteId);
  return getClient().listSiteMedia(token, siteId);
}

// uploadMedia(token, siteId, file) or uploadMedia(siteId, file) when auth token is stored in browser
export async function uploadMedia(tokenOrSiteId: string, siteIdOrFile: string | File, maybeFile?: File): Promise<MediaItem> {
  const isTwoArgs = siteIdOrFile instanceof File;
  const { token, siteId } = isTwoArgs
    ? resolveTokenAndSite(tokenOrSiteId)
    : resolveTokenAndSite(tokenOrSiteId, siteIdOrFile as string);
  const file = isTwoArgs ? siteIdOrFile : (maybeFile as File);
  if (!file) throw new Error('File is required');
  return getClient().uploadSiteMedia(token, siteId, file);
}

// deleteMedia(token, siteId, mediaId) or deleteMedia(siteId, mediaId) when auth token is stored in browser
export async function deleteMedia(tokenOrSiteId: string, siteIdOrMediaId: string, maybeMediaId?: string): Promise<{ success: boolean }> {
  const { token, siteId } = resolveTokenAndSite(tokenOrSiteId, maybeMediaId ? siteIdOrMediaId : undefined);
  const mediaId = maybeMediaId ?? siteIdOrMediaId;
  return getClient().deleteSiteMedia(token, siteId, mediaId);
}
