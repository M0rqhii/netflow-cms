/**
 * Builder Modules Registry (shared, non-UI)
 *
 * Source of truth for module metadata used across API and Admin UI.
 */

export type BuilderModuleKey =
  | 'consent-security'
  | 'accessibility-widget'
  | 'payments'
  | 'shop'
  | 'forms-pro'
  | 'analytics'
  | 'meta-pixel'
  | 'tag-manager'
  | 'embeds-media'
  | 'maps'
  | 'blog-content';

export type BuilderModuleCategory =
  | 'security'
  | 'accessibility'
  | 'commerce'
  | 'forms'
  | 'analytics'
  | 'media'
  | 'maps'
  | 'content';

export type BuilderModuleDefinition = {
  key: BuilderModuleKey;
  title: string;
  description: string;
  category: BuilderModuleCategory;
  defaultEnabled: boolean;
  dependencies?: BuilderModuleKey[];
  plan?: 'core' | 'pro' | 'enterprise';
  recommendedIndustries?: string[];
};

export const BUILDER_MODULES: BuilderModuleDefinition[] = [
  {
    key: 'consent-security',
    title: 'Consent & Security',
    description: 'Cookie banner, consent preferences, and captcha for forms.',
    category: 'security',
    defaultEnabled: true,
    plan: 'core',
  },
  {
    key: 'accessibility-widget',
    title: 'Accessibility Widget',
    description: 'Front-end toolbar for contrast, text size, and focus helpers.',
    category: 'accessibility',
    defaultEnabled: true,
    plan: 'core',
    recommendedIndustries: ['Education', 'NGO/Public', 'Healthcare'],
  },
  {
    key: 'forms-pro',
    title: 'Forms Pro',
    description: 'Multi-step forms, file uploads, and advanced validation.',
    category: 'forms',
    defaultEnabled: false,
    plan: 'core',
  },
  {
    key: 'payments',
    title: 'Payments',
    description: 'Payment buttons, checkout embeds, and pricing blocks.',
    category: 'commerce',
    defaultEnabled: false,
    plan: 'pro',
  },
  {
    key: 'shop',
    title: 'Shop',
    description: 'Product grids, carts, and order summaries.',
    category: 'commerce',
    defaultEnabled: false,
    plan: 'pro',
    dependencies: ['payments'],
  },
  {
    key: 'analytics',
    title: 'Analytics (GA4)',
    description: 'Consent-aware Google Analytics tracking and events.',
    category: 'analytics',
    defaultEnabled: false,
    plan: 'pro',
    dependencies: ['consent-security'],
  },
  {
    key: 'meta-pixel',
    title: 'Meta Pixel',
    description: 'Meta/Facebook pixel injection gated by consent.',
    category: 'analytics',
    defaultEnabled: false,
    plan: 'pro',
    dependencies: ['consent-security'],
  },
  {
    key: 'tag-manager',
    title: 'Tag Manager',
    description: 'Google Tag Manager container slots with consent rules.',
    category: 'analytics',
    defaultEnabled: false,
    plan: 'pro',
    dependencies: ['consent-security'],
  },
  {
    key: 'embeds-media',
    title: 'Media Embeds',
    description: 'YouTube, Spotify, and social post embeds.',
    category: 'media',
    defaultEnabled: false,
    plan: 'core',
  },
  {
    key: 'maps',
    title: 'Maps',
    description: 'Map components (Google/OSM) and location cards.',
    category: 'maps',
    defaultEnabled: false,
    plan: 'core',
  },
  {
    key: 'blog-content',
    title: 'Blog',
    description: 'Blog list, post templates, and category chips.',
    category: 'content',
    defaultEnabled: false,
    plan: 'core',
  },
];

export const BUILDER_MODULES_BY_KEY = BUILDER_MODULES.reduce<Record<BuilderModuleKey, BuilderModuleDefinition>>(
  (acc, mod) => {
    acc[mod.key] = mod;
    return acc;
  },
  {} as Record<BuilderModuleKey, BuilderModuleDefinition>
);

export function isBuilderModuleKey(value: string): value is BuilderModuleKey {
  return value in BUILDER_MODULES_BY_KEY;
}

export function getBuilderModule(key: BuilderModuleKey): BuilderModuleDefinition | undefined {
  return BUILDER_MODULES_BY_KEY[key];
}

export function getBuilderModuleDependencies(key: BuilderModuleKey): BuilderModuleKey[] {
  return getBuilderModule(key)?.dependencies ?? [];
}

export function getBuilderModuleDependents(key: BuilderModuleKey): BuilderModuleKey[] {
  return BUILDER_MODULES.filter((mod) => mod.dependencies?.includes(key)).map((mod) => mod.key);
}
