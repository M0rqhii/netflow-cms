'use client';

import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import CollapseToggle from '@/components/ui/CollapseToggle';
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
        <Topbar right={<div className="flex gap-2"><TenantSwitcher /><LanguageToggle /><CollapseToggle /><ThemeToggle /><UserBar /></div>} />
        <div className="flex min-h-[calc(100vh-56px)]">
          <Sidebar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
