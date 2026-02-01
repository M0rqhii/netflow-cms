"use client";

import Link from 'next/link';
import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUi } from '@/lib/ui';
import { useTranslations } from '@/hooks/useTranslations';
import { decodeAuthToken, getAuthToken } from '@/lib/api';

type NavItem = { 
  href: string; 
  labelKey: string; 
  icon: React.ReactNode; 
  badge?: number;
};

type NavSection = {
  labelKey?: string;
  items: NavItem[];
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

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUi();
  const t = useTranslations();
  const [siteCount, setSiteCount] = React.useState<number | null>(null);
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [hasOrgOwnerRole, setHasOrgOwnerRole] = React.useState<boolean | null>(null);
  const [hasOrgAdminRole, setHasOrgAdminRole] = React.useState<boolean | null>(null);
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isDev = appProfile !== 'production';

  const token = (() => {
    const authToken = getAuthToken();
    if (authToken) return authToken;
    if (typeof window === 'undefined') return null;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('siteToken:') || key.startsWith('orgToken:')) {
          const value = localStorage.getItem(key);
          if (value) return value;
        }
      }
    } catch {
      return null;
    }
    return null;
  })();

  const payload = decodeAuthToken(token);
  const userId = payload?.sub;
  
  // Check role from multiple possible fields (from JWT token - fallback)
  const platformRole = String(payload?.platformRole ?? '').toLowerCase();
  const role = String(payload?.role ?? '').toLowerCase();
  const systemRole = String(payload?.systemRole ?? '').toLowerCase();
  const roleMarker = platformRole || role || systemRole;
  const isSuperFromToken = Boolean(payload?.isSuperAdmin) || systemRole === 'super_admin' || role === 'super_admin';
  const isPrivileged = Boolean(
    isSuperFromToken ||
      ['org_admin', 'site_admin', 'platform_admin'].includes(role) ||
      ['admin', 'owner'].includes(platformRole) ||
      systemRole === 'system_admin'
  );
  
  // Check roles from JWT token (fallback if RBAC not loaded yet)
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
    
  // Check if user has site_admin role (might also need org settings access)
  const isSiteAdmin = role === 'site_admin' || systemRole === 'site_admin';
  
  // Use RBAC roles if available, otherwise fall back to token roles
  const isOwner = hasOrgOwnerRole !== null ? hasOrgOwnerRole : isOwnerFromToken;
  const isAdmin = hasOrgAdminRole !== null ? hasOrgAdminRole : isAdminFromToken;
  
  // Owners, admins, and site admins can access org settings (view at least)
  const canAccessOrgSettings = isOwner || isAdmin || isSiteAdmin;
  
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // First, try to get orgId from JWT token
        let orgIdFromToken = payload?.orgId;
        
        // If orgId not in token, try to get it from profile API
        if (!orgIdFromToken && payload?.sub) {
          try {
            const mod = await import('@/lib/api');
            const profile = await mod.getProfile();
            orgIdFromToken = profile?.orgId;
          } catch (profileError) {
            console.warn('[Sidebar] Could not fetch profile to get orgId:', profileError);
          }
        }
        
        if (orgIdFromToken && !cancelled) {
          setOrgId(orgIdFromToken);
        }
        
        // Also fetch sites to get count using cached hook
        const mod = await import('@/hooks/useSites');
        const { loadSitesWithCache } = mod;
        const data = await loadSitesWithCache();
        if (!cancelled) {
          setSiteCount(data.length);
          // If orgId still not found but user has sites, log a warning
          if (!orgIdFromToken && data.length > 0) {
            console.warn('[Sidebar] orgId not found. User should re-login to refresh token with orgId.');
          }
        }
      } catch (error) {
        console.error('[Sidebar] Error loading sites:', error);
        if (!cancelled) {
          setSiteCount(null);
          // Don't clear orgId if we got it from token
          const orgIdFromToken = payload?.orgId;
          if (!orgIdFromToken) {
            setOrgId(null);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [payload?.orgId, payload?.sub]);

  // Check RBAC roles when orgId and userId are available
  React.useEffect(() => {
    if (!orgId || !userId) {
      setHasOrgOwnerRole(null);
      setHasOrgAdminRole(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@/lib/api');
        // Fetch RBAC assignments for this user in this org
        const assignments = await mod.fetchRbacAssignments(orgId, { userId });
        
        if (!cancelled) {
          // Check if user has "Org Owner" role (SYSTEM, ORG scope)
          const hasOwner = assignments.some(
            a => a.role.name === 'Org Owner' && 
                 a.role.type === 'SYSTEM' && 
                 a.role.scope === 'ORG'
          );
          
          // Check if user has "Org Admin" role (SYSTEM, ORG scope)
          const hasAdmin = assignments.some(
            a => a.role.name === 'Org Admin' && 
                 a.role.type === 'SYSTEM' && 
                 a.role.scope === 'ORG'
          );
          
          setHasOrgOwnerRole(hasOwner);
          setHasOrgAdminRole(hasAdmin);
        }
      } catch (error) {
        console.warn('[Sidebar] Failed to fetch RBAC assignments:', error);
        // On error, keep null to use token-based roles as fallback
        if (!cancelled) {
          setHasOrgOwnerRole(null);
          setHasOrgAdminRole(null);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [orgId, userId]);

  // Debug: log user role for troubleshooting
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && token && payload) {
      const debugInfo = {
        platformRole: payload.platformRole,
        role: payload.role,
        systemRole: payload.systemRole,
        roleMarker,
        hasOrgOwnerRole,
        hasOrgAdminRole,
        isOwnerFromToken,
        isAdminFromToken,
        isOwner,
        isAdmin,
        isSiteAdmin,
        canAccessOrgSettings,
        orgId,
        userId,
        email: payload.email,
      };
      console.log('[Sidebar] User role info:', debugInfo);
      const windowWithDebug = window as Window & { __sidebarDebugInfo?: Record<string, unknown> };
      windowWithDebug.__sidebarDebugInfo = debugInfo;
    }
  }, [token, payload, roleMarker, hasOrgOwnerRole, hasOrgAdminRole, isOwnerFromToken, isAdminFromToken, isOwner, isAdmin, isSiteAdmin, canAccessOrgSettings, orgId, userId]);

  const sections: NavSection[] = useMemo(() => [
    {
      items: [
        { href: '/dashboard', labelKey: 'navigation.dashboard', icon: Icon.dashboard },
        { href: '/sites', labelKey: 'navigation.sites', icon: Icon.sites, badge: siteCount ?? undefined },
      ],
    },
    {
      labelKey: 'navigation.business',
      items: [
        { href: '/account', labelKey: 'navigation.account', icon: Icon.account },
        ...(canAccessOrgSettings && orgId ? [{ href: `/org/${orgId}/settings/general`, labelKey: 'navigation.orgSettings', icon: Icon.settings }] : []),
        ...(isOwner ? [{ href: '/billing', labelKey: 'navigation.billing', icon: Icon.billing }] : []),
      ],
    },
    ...(isDev && isPrivileged ? [{
      labelKey: 'navigation.development',
      items: [
        { href: '/dev', labelKey: 'navigation.dev', icon: Icon.dev },
      ],
    }] : []),
  ], [siteCount, isOwner, isDev, isPrivileged, orgId, canAccessOrgSettings]);

  return (
    <aside className={clsx('sidebar hidden md:block transition-all h-full', sidebarCollapsed ? 'w-16' : 'w-60')} aria-label="Main navigation">
      <nav className="p-3 space-y-4 h-full overflow-y-auto" role="navigation" aria-label="Main navigation">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-1">
            {!sidebarCollapsed && section.labelKey && (
              <div className="px-3 py-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t(section.labelKey)}
                </h2>
              </div>
            )}
            {section.items.map((it) => {
              const active = pathname?.startsWith(it.href) && it.href !== '#';
              const label = t(it.labelKey);
              
              return (
                <Link
                  key={it.href + it.labelKey}
                  href={it.href}
                  className={clsx('nav-link tooltip', active && 'nav-link--active')}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  data-tip={sidebarCollapsed ? label : undefined}
                >
                  <span className="shrink-0" aria-hidden="true">{it.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{label}</span>
                      {it.badge !== undefined && it.badge !== null && (
                        <span className="ml-auto badge" aria-label={`${it.badge} items`}>{it.badge}</span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
