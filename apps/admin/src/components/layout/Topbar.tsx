import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

type TopbarProps = {
  right?: React.ReactNode;
};

export function Topbar({ right }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="container flex items-center justify-between h-14 overflow-visible px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0" aria-label="Net-Flow - Go to dashboard">
            <Image 
              src="/assets/Net-Flow-Logo-Horizontal.png" 
              alt="Net-Flow" 
              width={132} 
              height={28} 
              priority 
              className="h-6 sm:h-7 w-auto object-contain flex-shrink-0"
            />
          </Link>
          <span className="hidden lg:inline text-sm text-muted whitespace-nowrap flex-shrink-0">Panel zarządzania</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0" role="toolbar" aria-label="User actions">{right}</div>
      </div>
      <div className="accent-bar" aria-hidden="true" />
    </header>
  );
}

export default Topbar;
