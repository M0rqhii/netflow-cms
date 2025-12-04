import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

type TopbarProps = {
  right?: React.ReactNode;
};

export function Topbar({ right }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="container flex items-center justify-between h-14 overflow-visible">
        <div className="flex items-center gap-3 min-w-0 flex-shrink">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <Image 
              src="/assets/Net-Flow-Logo-Horizontal.png" 
              alt="Net-Flow" 
              width={132} 
              height={28} 
              priority 
              className="h-7 w-auto object-contain flex-shrink-0"
            />
          </Link>
          <span className="hidden sm:inline text-sm text-muted whitespace-nowrap flex-shrink-0">Panel zarządzania</span>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="accent-bar" />
    </header>
  );
}

export default Topbar;
