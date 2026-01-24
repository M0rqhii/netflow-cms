/**
 * DomainProvider Interface
 * 
 * Abstract interface for domain management providers (Cloudflare, Route53, etc.)
 * Represents what the platform needs to do, not how specific providers implement it.
 */

export interface ConfigureDomainParams {
  domain: string;
  siteId: string;
  targetUrl?: string; // Where the domain should point
  metadata?: Record<string, any>;
}

export interface DomainConfigurationResult {
  domain: string;
  status: 'configured' | 'pending' | 'failed';
  dnsRecords?: Array<{
    type: string;
    name: string;
    value: string;
  }>;
  sslStatus?: 'active' | 'pending' | 'failed';
  metadata?: Record<string, any>;
}

export interface EnsureSSLParams {
  domain: string;
  siteId: string;
}

export interface DomainProvider {
  /**
   * Configure a domain for a site
   */
  configureDomain(params: ConfigureDomainParams): Promise<DomainConfigurationResult>;

  /**
   * Ensure SSL certificate is active for a domain
   */
  ensureSSL(params: EnsureSSLParams): Promise<{ sslStatus: 'active' | 'pending' | 'failed' }>;

  /**
   * Remove domain configuration
   */
  removeDomain?(domain: string, siteId: string): Promise<void>;

  /**
   * Get domain status
   */
  getDomainStatus?(domain: string, siteId: string): Promise<DomainConfigurationResult | null>;
}









