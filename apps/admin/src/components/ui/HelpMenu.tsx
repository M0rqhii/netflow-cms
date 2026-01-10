"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { requestOnboardingShow } from '@/lib/onboarding';

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [open]);

  const handleShowTips = () => {
    requestOnboardingShow();
    setOpen(false);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="btn btn-outline text-xs sm:text-sm px-2 sm:px-3"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="hidden sm:inline">Pomoc</span>
        <span className="sm:hidden">?</span>
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-48 sm:w-52 rounded-md border border-border bg-card shadow-lg z-50">
          <button
            type="button"
            className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={handleShowTips}
            role="menuitem"
          >
            Pokaż wskazówki
          </button>
        </div>
      ) : null}
    </div>
  );
}
