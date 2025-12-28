/**
 * Feature Catalog - Static registry of all available features
 * AI Note: This is the source of truth for feature definitions
 */

export type FeatureCategory = 'content' | 'media' | 'seo' | 'hosting' | 'integrations';

export interface Feature {
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  experimental?: boolean;
}

/**
 * Complete feature catalog
 * All features that can be enabled/disabled per plan or per site
 */
export const FEATURES: Feature[] = [
  // Content features
  {
    key: 'page_builder',
    name: 'Page Builder',
    description: 'Visual page builder with drag-and-drop interface',
    category: 'content',
  },
  {
    key: 'content_editor',
    name: 'Content Editor',
    description: 'Rich text content editor with formatting options',
    category: 'content',
  },
  {
    key: 'collections',
    name: 'Collections',
    description: 'Dynamic content collections with custom schemas',
    category: 'content',
  },
  {
    key: 'content_workflow',
    name: 'Content Workflow',
    description: 'Multi-stage content approval and review workflow',
    category: 'content',
  },
  {
    key: 'content_versioning',
    name: 'Content Versioning',
    description: 'Version history and rollback for content items',
    category: 'content',
  },
  {
    key: 'snapshots',
    name: 'Snapshots',
    description: 'Create and restore content snapshots',
    category: 'content',
    experimental: true,
  },
  
  // Media features
  {
    key: 'media_manager',
    name: 'Media Manager',
    description: 'Upload, organize, and manage media files',
    category: 'media',
  },
  {
    key: 'media_transformations',
    name: 'Media Transformations',
    description: 'Image resizing, cropping, and format conversion',
    category: 'media',
  },
  {
    key: 'cdn_integration',
    name: 'CDN Integration',
    description: 'CDN delivery for media files',
    category: 'media',
  },
  
  // SEO features
  {
    key: 'seo_settings',
    name: 'SEO Settings',
    description: 'Site-wide SEO configuration and meta tags',
    category: 'seo',
  },
  {
    key: 'seo_analytics',
    name: 'SEO Analytics',
    description: 'SEO performance tracking and insights',
    category: 'seo',
  },
  {
    key: 'sitemap_generation',
    name: 'Sitemap Generation',
    description: 'Automatic XML sitemap generation',
    category: 'seo',
  },
  
  // Hosting features
  {
    key: 'custom_domains',
    name: 'Custom Domains',
    description: 'Connect custom domains to your site',
    category: 'hosting',
  },
  {
    key: 'ssl_certificates',
    name: 'SSL Certificates',
    description: 'Automatic SSL certificate management',
    category: 'hosting',
  },
  {
    key: 'environment_deployment',
    name: 'Environment Deployment',
    description: 'Deploy to staging and production environments',
    category: 'hosting',
  },
  {
    key: 'backup_restore',
    name: 'Backup & Restore',
    description: 'Automated backups and restore functionality',
    category: 'hosting',
  },
  
  // Integration features
  {
    key: 'webhooks',
    name: 'Webhooks',
    description: 'Send webhooks on content events',
    category: 'integrations',
  },
  {
    key: 'api_access',
    name: 'API Access',
    description: 'RESTful API access to content',
    category: 'integrations',
  },
  {
    key: 'graphql_api',
    name: 'GraphQL API',
    description: 'GraphQL API access to content',
    category: 'integrations',
  },
  {
    key: 'third_party_integrations',
    name: 'Third-Party Integrations',
    description: 'Integrate with external services (Stripe, Mailchimp, etc.)',
    category: 'integrations',
  },
];

/**
 * Get feature by key
 */
export function getFeatureByKey(key: string): Feature | undefined {
  return FEATURES.find((f) => f.key === key);
}

/**
 * Get all features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): Feature[] {
  return FEATURES.filter((f) => f.category === category);
}

/**
 * Get all feature keys
 */
export function getAllFeatureKeys(): string[] {
  return FEATURES.map((f) => f.key);
}

/**
 * Validate feature key exists
 */
export function isValidFeatureKey(key: string): boolean {
  return FEATURES.some((f) => f.key === key);
}





