"use client";

import type { ReactNode } from 'react';
import {
  FiShield,
  FiEye,
  FiCreditCard,
  FiShoppingCart,
  FiFileText,
  FiBarChart2,
  FiTarget,
  FiTag,
  FiPlayCircle,
  FiMapPin,
  FiBookOpen,
} from 'react-icons/fi';
import {
  BUILDER_MODULES as SCHEMA_MODULES,
  getBuilderModule,
  getBuilderModuleDependencies,
  getBuilderModuleDependents,
  isBuilderModuleKey,
  type BuilderModuleKey,
  type BuilderModuleCategory,
  type BuilderModuleDefinition,
} from '@repo/schemas';

export type BuilderModuleDefinitionWithIcon = BuilderModuleDefinition & {
  icon: ReactNode;
};

const MODULE_ICONS: Record<BuilderModuleKey, ReactNode> = {
  'consent-security': <FiShield />,
  'accessibility-widget': <FiEye />,
  payments: <FiCreditCard />,
  shop: <FiShoppingCart />,
  'forms-pro': <FiFileText />,
  analytics: <FiBarChart2 />,
  'meta-pixel': <FiTarget />,
  'tag-manager': <FiTag />,
  'embeds-media': <FiPlayCircle />,
  maps: <FiMapPin />,
  'blog-content': <FiBookOpen />,
};

export type { BuilderModuleKey, BuilderModuleCategory, BuilderModuleDefinition };

const BASE_MODULES = Array.isArray(SCHEMA_MODULES) ? SCHEMA_MODULES : [];

const FALLBACK_MODULES: BuilderModuleDefinition[] = [
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

const EFFECTIVE_MODULES = BASE_MODULES.length ? BASE_MODULES : FALLBACK_MODULES;

if (!BASE_MODULES.length) {
  if (typeof console !== 'undefined') {
    console.warn('[Builder] BUILDER_MODULES is empty - check @repo/schemas export');
  }
}


export const BUILDER_MODULES: BuilderModuleDefinitionWithIcon[] = EFFECTIVE_MODULES.map((module) => ({
  ...module,
  icon: MODULE_ICONS[module.key],
}));

export function getBuilderModuleKeys(): BuilderModuleKey[] {
  return EFFECTIVE_MODULES.map((mod) => mod.key);
}

export { getBuilderModuleDependencies, getBuilderModuleDependents, isBuilderModuleKey };

export function getModuleDisplayTitle(key: string): string {
  return (getBuilderModule(key as BuilderModuleKey) ?? { title: key }).title;
}

export default BUILDER_MODULES;
