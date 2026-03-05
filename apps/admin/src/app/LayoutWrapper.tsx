'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileMenu } from '@/components/layout/MobileMenu';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import CollapseToggle from '@/components/ui/CollapseToggle';
import MobileMenuToggle from '@/components/ui/MobileMenuToggle';
import HelpMenu from '@/components/ui/HelpMenu';
import CommandPalette from '@/components/ui/CommandPalette';
import UserBar from '@/components/layout/UserBar';
import SiteSwitcher from '@/components/ui/SiteSwitcher';
import TopbarSearch from '@/components/layout/TopbarSearch';
import NotificationsMenu from '@/components/layout/NotificationsMenu';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = useMemo(() => pathname === '/login' || pathname.startsWith('/invite'), [pathname]);

  const topbarRight = useMemo(
    () => (
      <div className="flex items-center gap-1">
        <MobileMenuToggle />
        <SiteSwitcher />
        <TopbarSearch />
        <LanguageToggle />
        <CollapseToggle />
        <ThemeToggle />
        <HelpMenu />
        <NotificationsMenu />
        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
        <UserBar />
      </div>
    ),
    []
  );

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <ToastProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <CommandPalette />
        <Topbar right={topbarRight} />
        <MobileMenu />
        <div className="flex overflow-x-hidden" style={{ height: 'calc(100vh - 58px)' }}>
          <Sidebar />
          <main
            id="main-content"
            className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-background"
            style={{ maxHeight: 'calc(100vh - 58px)' }}
            role="main"
          >
            {children}
          </main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
