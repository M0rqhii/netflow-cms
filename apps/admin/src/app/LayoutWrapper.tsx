'use client';

import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileMenu } from '@/components/layout/MobileMenu';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import CollapseToggle from '@/components/ui/CollapseToggle';
import MobileMenuToggle from '@/components/ui/MobileMenuToggle';
import UserBar from '@/components/layout/UserBar';
import TenantSwitcher from '@/components/ui/TenantSwitcher';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Don't show navigation on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <ToastProvider>
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Skip to main content
        </a>
        <Topbar right={<div className="flex gap-2"><MobileMenuToggle /><TenantSwitcher /><LanguageToggle /><CollapseToggle /><ThemeToggle /><UserBar /></div>} />
        <MobileMenu />
        <div className="flex min-h-[calc(100vh-56px)]">
          <Sidebar />
          <main id="main-content" className="flex-1" role="main">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
