import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

type TopbarProps = {
  right?: React.ReactNode;
};

export function Topbar({ right }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="max-w-full flex items-center justify-between h-14 overflow-visible px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1">
          <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" aria-label="Net-Flow - Go to dashboard">
            <Image 
              src="/assets/Net-Flow-Logo-Horizontal.png" 
              alt="Net-Flow" 
              width={200}
              height={32}
              priority 
              className="h-5 sm:h-6 lg:h-7 w-auto object-contain flex-shrink-0"
            />
          </Link>
          <span className="hidden xl:inline text-xs sm:text-sm text-muted whitespace-nowrap flex-shrink-0">Panel zarządzania</span>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 flex-shrink-0" role="toolbar" aria-label="User actions">{right}</div>
      </div>
      <div className="accent-bar" aria-hidden="true" />
    </header>
  );
}

export default Topbar;
