// TypeScript SDK for API
// Lightweight browser-friendly API client

export type TenantInfo = {
  tenantId: string;
  role: string;
  tenant: { id: string; name: string; slug: string; plan: string };
};

// Alias for better naming - site instead of tenant
export type SiteInfo = {
  siteId: string;
  role: string;
  site: { id: string; name: string; slug: string; plan: string };
};

// Helper function to convert TenantInfo to SiteInfo
export function toSiteInfo(tenantInfo: TenantInfo): SiteInfo {
  return {
    siteId: tenantInfo.tenantId,
    role: tenantInfo.role,
    site: tenantInfo.tenant,
  };
}

export type MediaItem = {
  id: string;
  tenantId: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  alt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
};

export type EnvironmentType = 'draft' | 'production';
export type PageStatus = 'draft' | 'published' | 'archived';

export type SiteEnvironment = {
  id: string;
  tenantId: string;
  type: EnvironmentType;
  createdAt: string;
  updatedAt: string;
};

export type SitePage = {
  id: string;
  tenantId: string;
  environmentId: string;
  slug: string;
  title: string;
  status: PageStatus;
  content: unknown;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SiteSnapshot = {
  id: string;
  siteId: string;
  label: string;
  createdAt: string;
};

export type SiteEvent = {
  id: string;
  siteId: string;
  userId?: string | null;
  type: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
};

export type SiteDeployment = {
  id: string;
  siteId: string;
  env: string;
  type: string;
  status: 'success' | 'failed';
  message?: string | null;
  createdAt: string;
};

export class ApiClient {
  constructor(private baseUrl: string) {}

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    
    // Debug: log request URL in development (using console.log as SDK doesn't have logger)
    // Note: This is acceptable for SDK as it's a lightweight client library
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('[SDK] Request:', url);
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(options?.headers || {}),
        },
      });
      
      // Handle 401 Unauthorized - clear tokens and redirect to login
      if (response.status === 401) {
        // Clear all tokens from localStorage
        if (typeof window !== 'undefined') {
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
            // Silently fail if localStorage is not available
          }
          // Redirect to login
          window.location.href = '/login';
        }
        const text = await response.text().catch(() => '');
        throw new Error(`Unauthorized. Please login again. ${text || response.statusText}`);
      }
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API Error ${response.status}: ${text || response.statusText}`);
      }
      
      if (response.status === 204) return undefined as unknown as T;
      
      // Check content-length header to detect empty responses
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return undefined as unknown as T;
      }
      
      // Parse JSON with error handling for empty or invalid responses
      try {
        const text = await response.text();
        if (!text || !text.trim()) {
          return undefined as unknown as T;
        }
        return JSON.parse(text) as T;
      } catch (parseError) {
        // If JSON parsing fails, it might be an empty response or invalid JSON
        if (parseError instanceof SyntaxError && parseError.message.includes('JSON')) {
          // Likely an empty response that wasn't caught by content-length check
          return undefined as unknown as T;
        }
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      // Enhanced error handling for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`NetworkError: Cannot connect to API at ${url}. Make sure backend is running and NEXT_PUBLIC_API_URL is set correctly.`);
      }
      throw error;
    }
  }

  async getMyTenants(token: string): Promise<TenantInfo[]> {
    return this.request<TenantInfo[]>(`/auth/me/tenants`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Alias for better naming - site instead of tenant
  async getMySites(token: string): Promise<SiteInfo[]> {
    return this.getMyTenants(token);
  }

  async issueTenantToken(token: string, tenantId: string): Promise<{ access_token: string }> {
    return this.request<{ access_token: string }>(`/auth/tenant-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId }),
    });
  }

  async login(tenantId: string | undefined, email: string, password: string): Promise<{ access_token: string; user: unknown }> {
    return this.request(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ ...(tenantId ? { tenantId } : {}), email, password }),
    });
  }

  async resolveTenant(token: string, slug: string): Promise<{ id: string; name: string; slug: string; plan: string }> {
    return this.request(`/auth/resolve-tenant/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async patch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(data),
    });
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  // Billing methods
  async getSubscriptions(token: string): Promise<{ subscriptions: any[]; pagination: any }> {
    return this.request<{ subscriptions: any[]; pagination: any }>(`/billing/subscriptions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getInvoices(token: string, page?: number, pageSize?: number): Promise<{ invoices: any[]; pagination: any }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ invoices: any[]; pagination: any }>(`/billing/invoices${query}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getTenantSubscription(token: string, tenantId: string): Promise<any> {
    return this.request<any>(`/tenants/${encodeURIComponent(tenantId)}/subscription`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getTenantInvoices(token: string, tenantId: string, page?: number, pageSize?: number): Promise<{ invoices: any[]; pagination: any }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ invoices: any[]; pagination: any }>(`/tenants/${encodeURIComponent(tenantId)}/invoices${query}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Account methods
  async getAccount(token: string): Promise<any> {
    return this.request<any>(`/account`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateAccount(token: string, data: { name?: string; preferredLanguage?: 'pl' | 'en' }): Promise<any> {
    return this.request<any>(`/account`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  async changePassword(token: string, data: { oldPassword: string; newPassword: string }): Promise<any> {
    return this.request<any>(`/account/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  async getBillingInfo(token: string): Promise<any> {
    return this.request<any>(`/account/billing-info`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateBillingInfo(token: string, data: { companyName?: string; nip?: string; address?: string }): Promise<any> {
    return this.request<any>(`/account/billing-info`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  // Dev endpoints (non-prod only)
  async getDevSummary(token: string): Promise<{
    profile: string;
    sites: number;
    users: number;
    emails: number;
    subscriptions: number;
  }> {
    return this.request(`/dev/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getDevSites(token: string): Promise<
    Array<{ id: string; name: string; slug: string; plan: string; createdAt?: string }>
  > {
    return this.request(`/dev/sites`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getDevEmails(token: string): Promise<
    Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; createdAt?: string }>
  > {
    return this.request(`/dev/emails`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getDevPayments(token: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      plan: string;
      status: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      createdAt?: string;
    }>
  > {
    return this.request(`/dev/payments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getDevLogs(token: string): Promise<any[]> {
    return this.request(`/dev/logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Site media (Site Panel)
  async listSiteMedia(token: string, siteId: string): Promise<MediaItem[]> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/media`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async uploadSiteMedia(token: string, siteId: string, file: File): Promise<MediaItem> {
    const form = new FormData();
    form.append('file', file);

    return this.request(`/site-panel/${encodeURIComponent(siteId)}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }

  async deleteSiteMedia(token: string, siteId: string, mediaId: string): Promise<{ success: boolean }> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/media/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Feature flags
  async isFeatureEnabled(token: string, feature: string): Promise<boolean> {
    const result = await this.request<{ feature: string; enabled: boolean }>(
      `/features/${encodeURIComponent(feature)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return result.enabled;
  }

  async getAllFeatureFlags(token: string): Promise<Record<string, boolean>> {
    const result = await this.request<{ flags: Record<string, boolean> }>(
      `/features`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return result.flags;
  }

  // Billing helpers - Site subscription methods
  async getSiteBilling(token: string, siteId: string): Promise<{
    siteId: string;
    plan: string;
    status: string;
    renewalDate: string | null;
    currentPeriodStart?: string;
    cancelAtPeriodEnd?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }> {
    return this.request(`/billing/site/${encodeURIComponent(siteId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateSiteBilling(
    token: string,
    siteId: string,
    data: { plan?: 'BASIC' | 'PRO'; status?: string; renewalDate?: string }
  ): Promise<{
    siteId: string;
    plan: string;
    status: string;
    renewalDate: string;
    currentPeriodStart: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request(`/billing/site/${encodeURIComponent(siteId)}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  async getMyBillingInfo(token: string): Promise<{
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
    subscriptions: Array<{
      id: string;
      tenantId: string;
      plan: string;
      status: string;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      tenant?: { id: string; name: string; slug: string };
    }>;
    invoices: Array<{
      id: string;
      tenantId: string;
      subscriptionId: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      paidAt: string | null;
      tenant?: { id: string; name: string; slug: string };
      subscription?: { id: string; plan: string; status: string };
    }>;
  }> {
    return this.request(`/billing/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Site Panel: environments & pages
  async listSiteEnvironments(token: string, siteId: string): Promise<SiteEnvironment[]> {
    return this.get<SiteEnvironment[]>(`/site-panel/${encodeURIComponent(siteId)}/environments`, token);
  }

  async createSiteEnvironment(
    token: string,
    siteId: string,
    data: { type: EnvironmentType }
  ): Promise<SiteEnvironment> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/environments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  async listPages(
    token: string,
    siteId: string,
    params?: { environmentId?: string; environmentType?: EnvironmentType; status?: PageStatus }
  ): Promise<SitePage[]> {
    const search = new URLSearchParams();
    if (params?.environmentId) search.append('environmentId', params.environmentId);
    if (params?.environmentType) search.append('environmentType', params.environmentType);
    if (params?.status) search.append('status', params.status);
    const query = search.toString() ? `?${search.toString()}` : '';
    return this.get<SitePage[]>(`/site-panel/${encodeURIComponent(siteId)}/pages${query}`, token);
  }

  async createPage(
    token: string,
    siteId: string,
    data: { environmentId: string; slug: string; title: string; status?: PageStatus; content?: unknown }
  ): Promise<SitePage> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/pages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  }

  async getPage(token: string, siteId: string, pageId: string): Promise<SitePage> {
    return this.get<SitePage>(
      `/site-panel/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`,
      token,
    );
  }

  async updatePage(
    token: string,
    siteId: string,
    pageId: string,
    data: { title?: string; slug?: string; status?: PageStatus; content?: unknown }
  ): Promise<SitePage> {
    return this.patch<SitePage>(
      `/site-panel/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`,
      data,
      token,
    );
  }

  async updatePageContent(token: string, siteId: string, pageId: string, content: unknown): Promise<SitePage> {
    return this.patch<SitePage>(
      `/site-panel/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}/content`,
      { content },
      token,
    );
  }

  async deletePage(token: string, siteId: string, pageId: string): Promise<void> {
    await this.request(`/site-panel/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async publishPage(
    token: string,
    siteId: string,
    pageId: string,
    data?: { targetEnvironmentId?: string; targetEnvironmentType?: EnvironmentType }
  ): Promise<{ draft: SitePage; production: SitePage }> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data || {}),
    });
  }

  // Site SEO
  async getSeoSettings(token: string, siteId: string): Promise<SeoSettings> {
    return this.get<SeoSettings>(`/site-panel/${encodeURIComponent(siteId)}/seo`, token);
  }

  async updateSeoSettings(
    token: string,
    siteId: string,
    data: { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string; twitterCard?: string }
  ): Promise<SeoSettings> {
    return this.patch<SeoSettings>(`/site-panel/${encodeURIComponent(siteId)}/seo`, data, token);
  }

  // Snapshots
  async listSnapshots(token: string, siteId: string): Promise<SiteSnapshot[]> {
    return this.get<SiteSnapshot[]>(`/site-panel/${encodeURIComponent(siteId)}/snapshots`, token);
  }

  async createSnapshot(token: string, siteId: string, label?: string): Promise<SiteSnapshot> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/snapshots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(label ? { label } : {}),
    });
  }

  async restoreSnapshot(token: string, siteId: string, snapshotId: string): Promise<{ success: boolean }> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Site Events
  async listSiteEvents(token: string, siteId: string, limit?: number): Promise<SiteEvent[]> {
    const query = typeof limit === 'number' ? `?limit=${limit}` : '';
    return this.get<SiteEvent[]>(`/site-panel/${encodeURIComponent(siteId)}/events${query}`, token);
  }

  // Site Deployments
  async publishSite(token: string, siteId: string, pageId?: string): Promise<{
    deployment: SiteDeployment;
    pagesPublished: number;
    pages: SitePage[];
  }> {
    return this.request(`/site-panel/${encodeURIComponent(siteId)}/deployments/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(pageId ? { pageId } : {}),
    });
  }

  async publishPage(token: string, siteId: string, pageId: string): Promise<{
    deployment: SiteDeployment;
    pagesPublished: number;
    pages: SitePage[];
  }> {
    return this.publishSite(token, siteId, pageId);
  }

  async listDeployments(
    token: string,
    siteId: string,
    params?: { env?: string; type?: string; status?: 'success' | 'failed'; limit?: number }
  ): Promise<SiteDeployment[]> {
    const search = new URLSearchParams();
    if (params?.env) search.append('env', params.env);
    if (params?.type) search.append('type', params.type);
    if (params?.status) search.append('status', params.status);
    if (params?.limit) search.append('limit', params.limit.toString());
    const query = search.toString() ? `?${search.toString()}` : '';
    return this.get<SiteDeployment[]>(`/site-panel/${encodeURIComponent(siteId)}/deployments${query}`, token);
  }

  async getLatestDeployment(token: string, siteId: string, env?: string): Promise<SiteDeployment | null> {
    const query = env ? `?env=${encodeURIComponent(env)}` : '';
    return this.get<SiteDeployment | null>(`/site-panel/${encodeURIComponent(siteId)}/deployments/latest${query}`, token);
  }

  // Feature Flags
  async getSiteFeatures(token: string, siteId: string): Promise<{
    plan: string;
    planFeatures: string[];
    overrides: Array<{
      featureKey: string;
      enabled: boolean;
      createdAt: string;
    }>;
    effective: string[];
  }> {
    return this.get<{
      plan: string;
      planFeatures: string[];
      overrides: Array<{
        featureKey: string;
        enabled: boolean;
        createdAt: string;
      }>;
      effective: string[];
    }>(`/sites/${encodeURIComponent(siteId)}/features`, token);
  }

  async setFeatureOverride(
    token: string,
    siteId: string,
    featureKey: string,
    enabled: boolean
  ): Promise<{
    id: string;
    featureKey: string;
    enabled: boolean;
    createdAt: string;
  }> {
    return this.request<{
      id: string;
      featureKey: string;
      enabled: boolean;
      createdAt: string;
    }>(`/sites/${encodeURIComponent(siteId)}/features/override`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ featureKey, enabled }),
    });
  }

  async isFeatureEnabled(token: string, siteId: string, featureKey: string): Promise<boolean> {
    const features = await this.getSiteFeatures(token, siteId);
    return features.effective.includes(featureKey);
  }
}

export function createApiClient(): ApiClient {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  
  // Validate baseUrl - detect Docker hostnames that won't work in browser
  if (typeof window !== 'undefined' && (baseUrl.includes('://api:') || baseUrl.includes('://api/'))) {
    // Auto-correct common Docker hostname to a browser-friendly localhost URL
    const corrected = baseUrl.replace('://api:', '://localhost:').replace('://api/', '://localhost/');
    console.warn('[SDK] Rewriting Docker-only API URL', baseUrl, '=>', corrected);
    baseUrl = corrected;
  }
  
  return new ApiClient(baseUrl);
}

export * as Media from './media';
