'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

type Crumb = { label: string; href?: string };

type LabelResolver = (key: string) => string;

const PANEL_LABEL_KEYS: Record<string, string> = {
  overview: 'sitePanelNav.overview',
  pages: 'sitePanelNav.pages',
  'page-builder': 'sitePanelNav.builder',
  content: 'sitePanelNav.content',
  media: 'sitePanelNav.media',
  marketing: 'sitePanelNav.marketing',
  deployments: 'sitePanelNav.deployments',
  deployment: 'sitePanelNav.deployments',
  seo: 'sitePanelNav.seo',
  activity: 'sitePanelNav.activity',
  users: 'sitePanelNav.users',
  modules: 'sitePanelNav.modules',
  settings: 'sitePanelNav.settings',
  collections: 'sitePanelNav.collections',
  snapshots: 'sitePanelNav.snapshots',
  backups: 'sitePanelNav.snapshots',
  design: 'sitePanelNav.design',
};

const DEV_LABEL_KEYS: Record<string, string> = {
  runtime: 'navigation.devRuntime',
  'api-keys': 'navigation.devApiKeys',
  webhooks: 'navigation.devWebhooks',
  logs: 'navigation.devLogs',
  flags: 'navigation.devFlags',
};

const ORG_SETTINGS_LABEL_KEYS: Record<string, string> = {
  general: 'orgSettings.general',
  roles: 'orgSettings.roles',
  policies: 'orgSettings.policies',
  assignments: 'orgSettings.assignments',
  effective: 'orgSettings.effectivePermissions',
  users: 'orgSettings.users',
};

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveLabel(keyMap: Record<string, string>, value: string, t: LabelResolver): string {
  const labelKey = keyMap[value];
  return labelKey ? t(labelKey) : decodePart(value);
}

function buildSiteCrumbs(parts: string[], t: LabelResolver): Crumb[] {
  if (parts[1] === 'new') {
    return [
      { label: t('navigation.sites'), href: '/sites' },
      { label: t('common.create') },
    ];
  }

  if (!parts[1]) {
    return [{ label: t('navigation.sites') }];
  }

  const slug = decodePart(parts[1]);
  const base = `/sites/${encodeURIComponent(slug)}`;

  if (parts[2] === 'panel') {
    const section = parts[3] || 'overview';
    const crumbs: Crumb[] = [
      { label: t('navigation.sites'), href: '/sites' },
      { label: slug, href: base },
      { label: 'Panel', href: `${base}/panel` },
      { label: resolveLabel(PANEL_LABEL_KEYS, section, t) },
    ];

    if (parts[4]) {
      crumbs.push({ label: decodePart(parts[4]) });
    }

    return crumbs;
  }

  if (parts[2]) {
    const sectionLabel = parts[2] === 'users' ? t('navigation.users') : decodePart(parts[2]);
    return [
      { label: t('navigation.sites'), href: '/sites' },
      { label: slug, href: base },
      { label: sectionLabel },
    ];
  }

  return [
    { label: t('navigation.sites'), href: '/sites' },
    { label: slug },
  ];
}

export default function ShellBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations();

  const crumbs = useMemo<Crumb[]>(() => {
    const parts = (pathname || '').split('/').filter(Boolean);

    if (parts.length === 0 || parts[0] === 'dashboard') {
      return [{ label: t('navigation.dashboard') }];
    }

    if (parts[0] === 'sites') {
      return buildSiteCrumbs(parts, t);
    }

    if (parts[0] === 'dev') {
      const section = parts[1] || 'runtime';
      return [
        { label: t('navigation.dev'), href: '/dev' },
        { label: resolveLabel(DEV_LABEL_KEYS, section, t) },
      ];
    }

    if (parts[0] === 'org' && parts[2] === 'dashboard') {
      const orgId = decodePart(parts[1]);
      return [
        { label: `Org ${orgId}`, href: `/org/${encodeURIComponent(orgId)}/dashboard` },
        { label: t('navigation.dashboard') },
      ];
    }

    if (parts[0] === 'org' && parts[2] === 'settings') {
      const orgId = decodePart(parts[1]);
      const section = parts[3] || 'general';
      return [
        { label: `Org ${orgId}`, href: `/org/${encodeURIComponent(orgId)}/settings` },
        { label: t('navigation.orgSettings'), href: `/org/${encodeURIComponent(orgId)}/settings/general` },
        { label: resolveLabel(ORG_SETTINGS_LABEL_KEYS, section, t) },
      ];
    }

    if (parts[0] === 'account') return [{ label: t('navigation.account') }];
    if (parts[0] === 'billing') return [{ label: t('navigation.billing') }];
    if (parts[0] === 'users') return [{ label: t('navigation.users') }];
    if (parts[0] === 'settings') return [{ label: t('navigation.settings') }];
    if (parts[0] === 'collections') return [{ label: t('navigation.collections') }];
    if (parts[0] === 'media') return [{ label: t('navigation.media') }];
    if (parts[0] === 'types') return [{ label: t('navigation.types') }];

    return [];
  }, [pathname, t]);

  if (crumbs.length === 0) return null;
  return <Breadcrumbs items={crumbs} className="truncate" />;
}
