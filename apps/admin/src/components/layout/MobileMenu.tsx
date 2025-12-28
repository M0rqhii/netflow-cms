"use client";

import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUi } from '@/lib/ui';
import { useTranslations } from '@/hooks/useTranslations';

type NavItem = { 
  href: string; 
  labelKey: string; 
  icon: React.ReactNode; 
  badge?: number;
  devOnly?: boolean;
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
  media: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  collections: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  types: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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
};

export function MobileMenu() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenu } = useUi();
  const t = useTranslations();
  const [tenantCount, setTenantCount] = React.useState<number | null>(null);
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
  const isDev = appProfile !== 'production';
  
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@/lib/api');
        const data = await mod.fetchMyTenants();
        if (!cancelled) setTenantCount(data.length);
      } catch {
        if (!cancelled) setTenantCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    // Close menu when route changes
    setMobileMenu(false);
  }, [pathname, setMobileMenu]);

  const sections: NavSection[] = [
    {
      items: [
        { href: '/dashboard', labelKey: 'navigation.dashboard', icon: Icon.dashboard },
        { href: '/sites', labelKey: 'navigation.sites', icon: Icon.sites, badge: tenantCount ?? undefined },
      ],
    },
    {
      labelKey: 'navigation.content',
      items: [
        { href: '/media', labelKey: 'navigation.media', icon: Icon.media },
        { href: '/collections', labelKey: 'navigation.collections', icon: Icon.collections },
        { href: '/types', labelKey: 'navigation.types', icon: Icon.types },
      ],
    },
    {
      labelKey: 'navigation.management',
      items: [
        { href: '/users', labelKey: 'navigation.users', icon: Icon.users },
        { href: '/settings', labelKey: 'navigation.settings', icon: Icon.settings },
      ],
    },
    {
      labelKey: 'navigation.business',
      items: [
        { href: '/billing', labelKey: 'navigation.billing', icon: Icon.billing },
        { href: '/account', labelKey: 'navigation.account', icon: Icon.account },
      ],
    },
    ...(isDev ? [{
      labelKey: 'navigation.development',
      items: [
        { href: '/dev', labelKey: 'navigation.dev', icon: Icon.dev, devOnly: true },
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

