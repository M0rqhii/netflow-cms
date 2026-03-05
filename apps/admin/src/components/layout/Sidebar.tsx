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

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUi();
  const t = useTranslations();

  const roleState = useShellRoleState();

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

  return (
    <aside
      className={clsx('sidebar desktop-sidebar hidden md:block transition-all duration-200 h-full', sidebarCollapsed ? 'w-16' : 'w-60')}
      aria-label="Main navigation"
    >
      <nav className="p-3 space-y-5 h-full overflow-y-auto" role="navigation" aria-label="Main navigation">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-1">
            {!sidebarCollapsed && section.labelKey && (
              <div className="px-3 pt-2 pb-1.5">
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: 'rgb(var(--muted))' }}>
                  {t(section.labelKey)}
                </h2>
              </div>
            )}

            {sidebarCollapsed && section.labelKey && sectionIdx > 0 && (
              <div className="mx-3 mb-1" style={{ borderTop: '1px solid rgb(var(--border))' }} />
            )}

            {section.items.map((item) => {
              const active = isShellNavItemActive(pathname, item.href);
              const label = t(item.labelKey);
              const showSubnav = Boolean(item.subItems?.length) && active;

              return (
                <div key={item.href + item.labelKey}>
                  <Link
                    href={item.href}
                    className={clsx('nav-link', active && 'nav-link--active', sidebarCollapsed && 'justify-center px-0')}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <span className="shrink-0 transition-colors" aria-hidden="true">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate" style={{ fontWeight: active ? 900 : 650 }}>
                          {label}
                        </span>
                        {item.badge !== undefined && item.badge !== null && (
                          <span className="badge ml-auto" style={{ padding: '2px 8px', fontSize: '11px' }} aria-label={`${item.badge} items`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>

                  {showSubnav && (
                    <div className="subnav" data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
                      {item.subItems!.map((subItem) => {
                        const subActive = isShellSubItemActive(pathname, subItem.href);
                        const subLabel = t(subItem.labelKey);

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="subnav-link"
                            aria-current={subActive ? 'page' : undefined}
                            title={sidebarCollapsed ? subLabel : undefined}
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
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

