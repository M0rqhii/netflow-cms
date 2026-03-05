import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import ShellBreadcrumbs from '@/components/layout/ShellBreadcrumbs';

type TopbarProps = {
  right?: React.ReactNode;
};

export function Topbar({ right }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="max-w-full flex items-center justify-between h-14 overflow-visible px-4 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0 group" aria-label="Net-Flow - Go to dashboard">
            <Image
              src="/assets/Net-Flow-Logo-Horizontal.png"
              alt="Net-Flow"
              width={200}
              height={32}
              priority
              className="h-5 sm:h-6 lg:h-7 w-auto object-contain flex-shrink-0 transition-opacity group-hover:opacity-80"
            />
          </Link>
          <div className="w-px h-5 hidden md:block" style={{ background: 'rgb(var(--border))' }} />
          <div className="hidden md:block min-w-0">
            <ShellBreadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" role="toolbar" aria-label="User actions">
          {right}
        </div>
      </div>
      <div className="accent-bar" aria-hidden="true" />
    </header>
  );
}

export default Topbar;
