/**
 * Builder block -> module mapping for publish validation.
 *
 * IMPORTANT: Block type keys MUST match the `type` field in catalogBlocks.tsx.
 * When adding/removing blocks, update this map AND the catalog.
 */

import type { BuilderModuleKey } from './builder-modules';

export const BLOCK_MODULE_MAP: Record<string, BuilderModuleKey> = {
  // consent-security
  'cookie-notice': 'consent-security',
  'consent-preferences': 'consent-security',
  'captcha': 'consent-security',
  'captcha-field': 'consent-security',

  // accessibility-widget
  'accessibility-widget': 'accessibility-widget',
  'skip-to-content': 'accessibility-widget',

  // payments
  'payment-button': 'payments',
  'checkout-embed': 'payments',
  'pricing-card': 'payments',

  // shop
  'product-grid': 'shop',
  'product-card': 'shop',
  'product-gallery': 'shop',
  'price': 'shop',
  'add-to-cart-button': 'shop',
  'cart-icon': 'shop',
  'mini-cart-drawer': 'shop',
  'order-summary': 'shop',
  'coupon-field': 'shop',
  'stock-badge': 'shop',

  // forms-pro
  'multi-step-form': 'forms-pro',
  'file-upload': 'forms-pro',
  'custom-css': 'forms-pro',

  // analytics
  'event-tracker': 'analytics',

  // meta-pixel
  'meta-pixel': 'meta-pixel',

  // tag-manager
  'script-embed': 'tag-manager',

  // embeds-media
  'embed': 'embeds-media',
  'calendly-embed': 'embeds-media',
  'chat-widget-embed': 'embeds-media',
  'youtube-playlist': 'embeds-media',
  'spotify-embed': 'embeds-media',
  'social-post-embed': 'embeds-media',

  // maps
  'google-map': 'maps',
  'location-card': 'maps',
  'directions-button': 'maps',

  // blog-content
  'blog-list': 'blog-content',
  'blog-post': 'blog-content',
  'category-chips': 'blog-content',
};

export function getModuleForBlockType(type: string): BuilderModuleKey | undefined {
  return BLOCK_MODULE_MAP[type];
}
