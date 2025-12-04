// TypeScript SDK for API
// Lightweight browser-friendly API client

export type TenantInfo = {
  tenantId: string;
  role: string;
  tenant: { id: string; name: string; slug: string; plan: string };
};

export class ApiClient {
  constructor(private baseUrl: string) {}

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Debug: log request URL in development (using console.log as SDK doesn't have logger)
    // Note: This is acceptable for SDK as it's a lightweight client library
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('[SDK] Request:', url);
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
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
      return (await response.json()) as T;
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
}

export function createApiClient(): ApiClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  return new ApiClient(baseUrl);
}
