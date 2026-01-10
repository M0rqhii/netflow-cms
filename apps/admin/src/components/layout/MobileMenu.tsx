"use client";

import Link from 'next/link';
import React from 'react';
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

export function MobileMenu() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenu } = useUi();
  const t = useTranslations();
  const [siteCount, setSiteCount] = React.useState<number | null>(null);
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [hasOrgOwnerRole, setHasOrgOwnerRole] = React.useState<boolean | null>(null);
  const [hasOrgAdminRole, setHasOrgAdminRole] = React.useState<boolean | null>(null);
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isDev = appProfile !== 'production';
  const token = getAuthToken();
  const payload = decodeAuthToken(token);
  const userId = payload?.sub;
  
  // Check role from multiple possible fields (from JWT token - fallback)
  const platformRole = String(payload?.platformRole ?? '').toLowerCase();
  const role = String(payload?.role ?? '').toLowerCase();
  const systemRole = String(payload?.systemRole ?? '').toLowerCase();
  const roleMarker = platformRole || role || systemRole;
  
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
  const isPrivileged = Boolean(
    payload?.isSuperAdmin ||
      roleMarker === 'super_admin' ||
      roleMarker === 'site_admin' ||
      roleMarker === 'platform_admin' ||
      String(payload?.systemRole ?? '').toLowerCase() === 'super_admin',
  );
  
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // First, try to get orgId from JWT token
        const token = getAuthToken();
        const payload = decodeAuthToken(token);
        let orgIdFromToken = payload?.orgId || payload?.tenantId; // tenantId for backward compatibility
        
        // If orgId not in token, try to get it from profile API
        if (!orgIdFromToken && payload?.sub) {
          try {
            const mod = await import('@/lib/api');
            const profile = await mod.getProfile();
            orgIdFromToken = profile?.orgId || profile?.tenantId;
          } catch (profileError) {
            console.warn('[MobileMenu] Could not fetch profile to get orgId:', profileError);
          }
        }
        
        if (orgIdFromToken && !cancelled) {
          setOrgId(orgIdFromToken);
        }
        
        // Also fetch sites to get count
        const mod = await import('@/lib/api');
        const data = await mod.fetchMySites();
        // Filter out sites with missing site property (same as in dashboard and sites page)
        const validSites = data.filter(s => s?.site != null);
        if (!cancelled) {
          setSiteCount(validSites.length);
          // If orgId still not found but user has sites, log a warning
          if (!orgIdFromToken && validSites.length > 0) {
            console.warn('[MobileMenu] orgId not found. User should re-login to refresh token with orgId.');
          }
        }
      } catch (error) {
        console.error('[MobileMenu] Error loading sites:', error);
        if (!cancelled) {
          setSiteCount(null);
          // Don't clear orgId if we got it from token
          const token = getAuthToken();
          const payload = decodeAuthToken(token);
          const orgIdFromToken = payload?.orgId || payload?.tenantId;
          if (!orgIdFromToken) {
            setOrgId(null);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
        console.warn('[MobileMenu] Failed to fetch RBAC assignments:', error);
        // On error, keep null to use token-based roles as fallback
        if (!cancelled) {
          setHasOrgOwnerRole(null);
          setHasOrgAdminRole(null);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [orgId, userId]);

  React.useEffect(() => {
    // Close menu when route changes
    setMobileMenu(false);
  }, [pathname, setMobileMenu]);

  const sections: NavSection[] = [
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
  ];

  if (!mobileMenuOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setMobileMenu(false)}
        aria-hidden="true"
      />
      {/* Menu */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r z-50 md:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('common.menu')}</h2>
          <button
            onClick={() => setMobileMenu(false)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={t('common.closeMenu')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-3 space-y-4" role="navigation" aria-label="Main navigation">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="space-y-1">
              {section.labelKey && (
                <div className="px-3 py-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {t(section.labelKey)}
                  </h3>
                </div>
              )}
              {section.items.map((it) => {
                const active = pathname?.startsWith(it.href) && it.href !== '#';
                const label = t(it.labelKey);
                
                return (
                  <Link
                    key={it.href + it.labelKey}
                    href={it.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="shrink-0" aria-hidden="true">{it.icon}</span>
                    <span className="truncate">{label}</span>
                    {it.badge !== undefined && it.badge !== null && (
                      <span className="ml-auto badge" aria-label={`${it.badge} items`}>{it.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default MobileMenu;
