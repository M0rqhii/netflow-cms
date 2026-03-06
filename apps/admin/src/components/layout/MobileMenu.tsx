'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUi } from '@/lib/ui';
import { useTranslations } from '@/hooks/useTranslations';
import {
  buildShellNavSections,
  isShellNavItemActive,
  isShellSubItemActive,
  useShellRoleState,
} from '@/components/layout/nav-config';

export function MobileMenu() {
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenu } = useUi();
  const t = useTranslations();

  const roleState = useShellRoleState();

  React.useEffect(() => {
    setMobileMenu(false);
  }, [pathname, setMobileMenu]);

  const sections = useMemo(
    () =>
      buildShellNavSections({
        siteCount: roleState.siteCount,
        orgId: roleState.orgId,
        isOwner: roleState.isOwner,
        isPrivileged: roleState.isPrivileged,
        canAccessOrgSettings: roleState.canAccessOrgSettings,
        isDev: roleState.isDev,
      }),
    [
      roleState.siteCount,
      roleState.orgId,
      roleState.isOwner,
      roleState.isPrivileged,
      roleState.canAccessOrgSettings,
      roleState.isDev,
    ]
  );

  if (!mobileMenuOpen) return null;

  return (
    <>
      <div className={clsx('mobile-overlay', mobileMenuOpen && 'open')} onClick={() => setMobileMenu(false)} aria-hidden="true" />
      <aside className={clsx('mobile-menu-panel', mobileMenuOpen && 'open')} aria-label="Main navigation">
        <nav className="p-[14px] space-y-3 h-full overflow-y-auto" role="navigation" aria-label="Main navigation">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2" onClick={() => setMobileMenu(false)}>
            <span className="avatar" aria-hidden="true">NF</span>
            <span className="text-sm font-black tracking-wide">Net-Flow</span>
          </Link>

          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="space-y-2">
              {section.labelKey && <div className="px-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted">{t(section.labelKey)}</div>}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isShellNavItemActive(pathname, item.href);
                  const label = t(item.labelKey);
                  const showSubnav = Boolean(item.subItems?.length) && active;

                  return (
                    <div key={item.href + item.labelKey}>
                      <Link
                        href={item.href}
                        className={clsx('nav-link', active && 'nav-link--active')}
                        aria-label={label}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileMenu(false)}
                      >
                        <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                        <span className="truncate" style={{ fontWeight: active ? 900 : 650 }}>{label}</span>
                        {item.badge !== undefined && item.badge !== null && (
                          <span className="badge ml-auto" style={{ padding: '2px 8px', fontSize: '11px' }} aria-label={`${item.badge} items`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {showSubnav && (
                        <div className="subnav mt-1" data-collapsed="false">
                          {item.subItems!.map((subItem) => {
                            const subActive = isShellSubItemActive(pathname, subItem.href);
                            const subLabel = t(subItem.labelKey);

                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className="subnav-link"
                                aria-current={subActive ? 'page' : undefined}
                                onClick={() => setMobileMenu(false)}
                              >
                                <span className="sub-dot" aria-hidden="true" />
                                <span className="sub-label">{subLabel}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default MobileMenu;
