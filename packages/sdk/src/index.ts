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
    
    // Debug: log request URL in development
    if (process.env.NODE_ENV === 'development') {
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
}

export function createApiClient(): ApiClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  return new ApiClient(baseUrl);
}
