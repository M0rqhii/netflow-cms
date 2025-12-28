"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@repo/ui';
import { useTranslations } from '@/hooks/useTranslations';

interface SitePanelNavProps {
  slug: string;
}

function IconWrapper({ children }: { children: React.ReactNode }) {
  return <span className="mr-2 inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">{children}</span>;
}

function OverviewIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M3.5 10a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
        <path d="M10 6.5v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
}

function PagesIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <rect x="4" y="4" width="10" height="12" rx="1.5" />
        <path d="M7 8h5M7 11h4" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

function CollectionsIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <rect x="3" y="4" width="14" height="4" rx="1" />
        <rect x="3" y="10" width="6" height="6" rx="1" />
        <rect x="11" y="10" width="6" height="6" rx="1" />
      </svg>
    </IconWrapper>
  );
}

function MediaIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 13l3.5-3.5a1 1 0 011.4 0L13 14" strokeLinecap="round" />
        <circle cx="12.5" cy="8" r="1" fill="currentColor" />
      </svg>
    </IconWrapper>
  );
}

function SeoIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M3.5 10a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
        <path d="M9 7h2.5a1.5 1.5 0 010 3H9V7zM9 10h2.8a1.7 1.7 0 011.7 1.7c0 .94-.76 1.7-1.7 1.7H9" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

function SnapshotIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <rect x="4" y="5" width="12" height="10" rx="2" />
        <path d="M7 8.5l3 2 3-2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
}

function ActivityIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M3 10h2l2 5 4-10 2 5h2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconWrapper>
  );
}

function DesignIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M5 5h10v10H5z" />
        <path d="M5 10h10M10 5v10" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

function DeploymentsIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M5 4.5h10a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
        <path d="M6.5 7h7M6.5 10h7M6.5 13h4" strokeLinecap="round" />
        <path d="M8 16h4" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

function SettingsIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M10 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
        <path d="M4.5 10a5.5 5.5 0 0111 0 5.5 5.5 0 01-11 0z" />
      </svg>
    </IconWrapper>
  );
}

function MarketingIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
        <path d="M3 10h14M10 3v14" strokeLinecap="round" />
        <circle cx="10" cy="10" r="6" />
        <path d="M6 10h8M10 6v8" strokeLinecap="round" />
      </svg>
    </IconWrapper>
  );
}

export function SitePanelNav({ slug }: SitePanelNavProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const basePath = `/sites/${slug}/panel`;

  const navItems = [
    { id: 'overview', labelKey: 'sitePanelNav.overview', hintKey: 'sitePanelNav.overviewHint', href: '/panel/overview', icon: OverviewIcon },
    { id: 'pages', labelKey: 'sitePanelNav.pages', hintKey: 'sitePanelNav.pagesHint', href: '/panel/pages', icon: PagesIcon },
    { id: 'deployments', labelKey: 'sitePanelNav.deployments', hintKey: 'sitePanelNav.deploymentsHint', href: '/panel/deployments', icon: DeploymentsIcon },
    { id: 'collections', labelKey: 'sitePanelNav.collections', hintKey: 'sitePanelNav.collectionsHint', href: '/panel/collections', icon: CollectionsIcon },
    { id: 'media', labelKey: 'sitePanelNav.media', hintKey: 'sitePanelNav.mediaHint', href: '/panel/media', icon: MediaIcon },
    { id: 'marketing', labelKey: 'sitePanelNav.marketing', hintKey: 'sitePanelNav.marketingHint', href: '/panel/marketing', icon: MarketingIcon },
    { id: 'seo', labelKey: 'sitePanelNav.seo', hintKey: 'sitePanelNav.seoHint', href: '/panel/seo', icon: SeoIcon },
    { id: 'snapshots', labelKey: 'sitePanelNav.snapshots', hintKey: 'sitePanelNav.snapshotsHint', href: '/panel/snapshots', icon: SnapshotIcon },
    { id: 'activity', labelKey: 'sitePanelNav.activity', hintKey: 'sitePanelNav.activityHint', href: '/panel/activity', icon: ActivityIcon },
    { id: 'design', labelKey: 'sitePanelNav.design', hintKey: 'sitePanelNav.designHint', href: '/panel/design', icon: DesignIcon },
    { id: 'settings', labelKey: 'sitePanelNav.settings', hintKey: 'sitePanelNav.settingsHint', href: '/panel/settings', icon: SettingsIcon },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-2 -mb-px" aria-label={t('sitePanelNav.siteWorkspaceNavigation')}>
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href || (item.id === 'overview' && pathname === basePath);
          const label = t(item.labelKey);
          const hint = t(item.hintKey);

          return (
            <Link key={item.id} href={href}>
              <Button
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                className="rounded-b-none border-b-0"
                aria-pressed={isActive}
                aria-label={`${label}${hint ? ` - ${hint}` : ''}`}
                title={hint}
              >
                {item.icon ? React.createElement(item.icon) : null}
                {label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
