/**
 * Builder block -> module mapping for publish validation.
 */

import type { BuilderModuleKey } from './builder-modules';

export const BLOCK_MODULE_MAP: Record<string, BuilderModuleKey> = {
  'cookie-notice': 'consent-security',
  'consent-preferences': 'consent-security',
  'captcha-field': 'consent-security',
  'accessibility-widget': 'accessibility-widget',
  'skip-to-content': 'accessibility-widget',
  'payment-button': 'payments',
  'checkout-embed': 'payments',
  'pricing-card': 'payments',
  'product-grid': 'shop',
  'product-card': 'shop',
  'cart-icon': 'shop',
  'mini-cart-drawer': 'shop',
  'add-to-cart': 'shop',
  'multi-step-form': 'forms-pro',
  'file-upload-field': 'forms-pro',
  'form-success': 'forms-pro',
  'form-error': 'forms-pro',
  'event-tracker': 'analytics',
  'meta-pixel': 'meta-pixel',
  'tag-manager-slot': 'tag-manager',
  'youtube-embed': 'embeds-media',
  'spotify-embed': 'embeds-media',
  'social-post-embed': 'embeds-media',
  'map': 'maps',
  'location-card': 'maps',
  'directions-button': 'maps',
  'blog-list': 'blog-content',
  'blog-post': 'blog-content',
  'category-chips': 'blog-content',
};

export function getModuleForBlockType(type: string): BuilderModuleKey | undefined {
  return BLOCK_MODULE_MAP[type];
}
