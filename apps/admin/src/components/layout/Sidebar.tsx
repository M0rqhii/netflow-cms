"use client";

import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUi } from '@/lib/ui';
import { useTranslations } from '@/hooks/useTranslations';

type Item = { href: string; labelKey: string; icon: React.ReactNode };

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
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.08a2 2 0 1 1-3.38 0l.02-.08A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.08.02a2 2 0 1 1 0-3.38l.08.02A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.08.02a2 2 0 1 1 0-3.38l.08.02A1.65 1.65 0 0 0 4.6 5c.17-.26.27-.57.27-.9s-.1-.64-.27-.9l-.02-.08a2 2 0 1 1 3.38 0l-.02.08c-.07.26-.05.53.06.77.11.24.3.45.54.54.24.11.51.13.77.06l.08-.02a2 2 0 1 1 3.38 0l-.08.02c-.26.07-.53.05-.77-.06a1.65 1.65 0 0 0-.54-.54c-.24-.11-.51-.13-.77-.06l-.08.02a2 2 0 1 1 0 3.38l.08-.02c.26-.07.53-.05.77.06.24.11.45.3.54.54.11.24.13.51.06.77l-.02.08A1.65 1.65 0 0 0 15 9c.26.17.57.27.9.27s.64-.1.9-.27l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.19.19-.44.32-.71.36-.27.04-.55 0-.79-.13-.24-.13-.44-.34-.57-.59A1.65 1.65 0 0 0 19.4 15Z" />
    </svg>
  ),
};

const items: Item[] = [
  { href: '/dashboard', labelKey: 'navigation.dashboard', icon: Icon.dashboard },
  { href: '/sites', labelKey: 'navigation.sites', icon: Icon.sites },
  { href: '/billing', labelKey: 'navigation.billing', icon: Icon.billing },
  { href: '/account', labelKey: 'navigation.account', icon: Icon.account },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUi();
  const t = useTranslations();
  const [tenantCount, setTenantCount] = React.useState<number | null>(null);
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
  return (
    <aside className={clsx('sidebar hidden md:block transition-all', sidebarCollapsed ? 'w-16' : 'w-60')}>
      <nav className="p-3 space-y-1">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href) && it.href !== '#';
          const label = t(it.labelKey);
          return (
            <Link key={it.href + it.labelKey} href={it.href} className={clsx('nav-link tooltip', active && 'nav-link--active')} aria-label={label} data-tip={sidebarCollapsed ? label : undefined}>
              <span className="shrink-0" aria-hidden>{it.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="truncate">{label}</span>
                  {it.labelKey === 'navigation.sites' && tenantCount !== null && (
                    <span className="ml-auto badge">{tenantCount}</span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
