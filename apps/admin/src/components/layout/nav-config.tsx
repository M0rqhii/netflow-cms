'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { decodeAuthToken, fetchRbacAssignments, getAuthToken, getProfile } from '@/lib/api';
import { loadSitesWithCache } from '@/hooks/useSites';

export type ShellNavSubItem = {
  href: string;
  labelKey: string;
};

export type ShellNavItem = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  badge?: number;
  subItems?: ShellNavSubItem[];
};

export type ShellNavSection = {
  labelKey?: string;
  items: ShellNavItem[];
};

export type ShellNavContext = {
  siteCount: number | null;
  orgId: string | null;
  isOwner: boolean;
  isPrivileged: boolean;
  canAccessOrgSettings: boolean;
  isDev: boolean;
};

export type ShellRoleState = ShellNavContext & {
  isAdmin: boolean;
  isSiteAdmin: boolean;
};

const Icon = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  sites: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8h20" />
      <path d="M6 12h12" />
    </svg>
  ),
  account: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  dev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

export const DEV_SUBNAV_ITEMS: ShellNavSubItem[] = [
  { href: '/dev/runtime', labelKey: 'navigation.devRuntime' },
  { href: '/dev/api-keys', labelKey: 'navigation.devApiKeys' },
  { href: '/dev/webhooks', labelKey: 'navigation.devWebhooks' },
  { href: '/dev/logs', labelKey: 'navigation.devLogs' },
  { href: '/dev/flags', labelKey: 'navigation.devFlags' },
];

export function buildShellNavSections(context: ShellNavContext): ShellNavSection[] {
  const sections: ShellNavSection[] = [
    {
      items: [
        { href: '/dashboard', labelKey: 'navigation.dashboard', icon: Icon.dashboard },
        { href: '/sites', labelKey: 'navigation.sites', icon: Icon.sites, badge: context.siteCount ?? undefined },
      ],
    },
    {
      labelKey: 'navigation.business',
      items: [
        { href: '/account', labelKey: 'navigation.account', icon: Icon.account },
        ...(context.canAccessOrgSettings && context.orgId
          ? [{ href: `/org/${context.orgId}/settings/general`, labelKey: 'navigation.orgSettings', icon: Icon.settings }]
          : []),
        ...(context.isOwner ? [{ href: '/billing', labelKey: 'navigation.billing', icon: Icon.billing }] : []),
      ],
    },
  ];

  if (context.isDev && context.isPrivileged) {
    sections.push({
      labelKey: 'navigation.development',
      items: [
        {
          href: '/dev',
          labelKey: 'navigation.dev',
          icon: Icon.dev,
          subItems: DEV_SUBNAV_ITEMS,
        },
      ],
    });
  }

  return sections;
}

export function isShellNavItemActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/sites') return pathname === '/sites' || pathname.startsWith('/sites/');
  if (href === '/dev') return pathname === '/dev' || pathname.startsWith('/dev/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isShellSubItemActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findAnyAvailableToken(): string | null {
  const authToken = getAuthToken();
  if (authToken) return authToken;
  if (typeof window === 'undefined') return null;

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('siteToken:') || key.startsWith('orgToken:')) {
        const value = window.localStorage.getItem(key);
        if (value) return value;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function useShellRoleState(): ShellRoleState {
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [hasOrgOwnerRole, setHasOrgOwnerRole] = useState<boolean | null>(null);
  const [hasOrgAdminRole, setHasOrgAdminRole] = useState<boolean | null>(null);

  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isDev = appProfile !== 'production';

  const token = useMemo(() => findAnyAvailableToken(), []);
  const payload = useMemo(() => decodeAuthToken(token), [token]);

  const userId = String(payload?.sub ?? '');

  const platformRole = String(payload?.platformRole ?? '').toLowerCase();
  const role = String(payload?.role ?? '').toLowerCase();
  const systemRole = String(payload?.systemRole ?? '').toLowerCase();

  const isSuperFromToken = Boolean(payload?.isSuperAdmin) || role === 'super_admin' || systemRole === 'super_admin';

  const isOwnerFromToken =
    platformRole === 'org_owner' ||
    platformRole === 'owner' ||
    platformRole === 'platform_owner' ||
    role === 'org_owner' ||
    role === 'owner' ||
    role === 'platform_owner' ||
    systemRole === 'org_owner' ||
    systemRole === 'owner';

  const isAdminFromToken =
    platformRole === 'org_admin' ||
    platformRole === 'admin' ||
    platformRole === 'platform_admin' ||
    role === 'org_admin' ||
    role === 'admin' ||
    role === 'platform_admin' ||
    systemRole === 'org_admin' ||
    systemRole === 'admin';

  const isSiteAdmin = role === 'site_admin' || systemRole === 'site_admin';

  const isOwner = isSuperFromToken || (hasOrgOwnerRole !== null ? hasOrgOwnerRole : isOwnerFromToken);
  const isAdmin = isSuperFromToken || (hasOrgAdminRole !== null ? hasOrgAdminRole : isAdminFromToken);

  const canAccessOrgSettings = isSuperFromToken || isOwner || isAdmin || isSiteAdmin;

  const isPrivileged =
    isSuperFromToken ||
    ['org_admin', 'site_admin', 'platform_admin'].includes(role) ||
    ['admin', 'owner'].includes(platformRole) ||
    systemRole === 'system_admin';

  useEffect(() => {
    let cancelled = false;

    const loadBaseData = async () => {
      let nextOrgId = payload?.orgId ? String(payload.orgId) : null;

      if (!nextOrgId && payload?.sub) {
        try {
          const profile = await getProfile();
          nextOrgId = profile?.orgId ?? null;
        } catch {
          nextOrgId = null;
        }
      }

      if (!cancelled) {
        setOrgId(nextOrgId);
      }

      try {
        const sites = await loadSitesWithCache();
        if (!cancelled) {
          setSiteCount(sites.length);
        }
      } catch {
        if (!cancelled) {
          setSiteCount(null);
        }
      }
    };

    void loadBaseData();

    return () => {
      cancelled = true;
    };
  }, [payload?.orgId, payload?.sub]);

  useEffect(() => {
    if (!orgId || !userId) {
      setHasOrgOwnerRole(null);
      setHasOrgAdminRole(null);
      return;
    }

    let cancelled = false;

    const loadRoles = async () => {
      try {
        const assignments = await fetchRbacAssignments(orgId, { userId });

        if (cancelled) return;

        const hasOwner = assignments.some(
          (item) => item.role.name === 'Org Owner' && item.role.type === 'SYSTEM' && item.role.scope === 'ORG'
        );

        const hasAdmin = assignments.some(
          (item) => item.role.name === 'Org Admin' && item.role.type === 'SYSTEM' && item.role.scope === 'ORG'
        );

        setHasOrgOwnerRole(hasOwner);
        setHasOrgAdminRole(hasAdmin);
      } catch {
        if (!cancelled) {
          setHasOrgOwnerRole(null);
          setHasOrgAdminRole(null);
        }
      }
    };

    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, [orgId, userId]);

  return {
    siteCount,
    orgId,
    isOwner,
    isAdmin,
    isSiteAdmin,
    isPrivileged,
    canAccessOrgSettings,
    isDev,
  };
}
