"use client";

import { useUi } from '@/lib/ui';

export default function MobileMenuToggle() {
  const { mobileMenuOpen, toggleMobileMenu } = useUi();
  
  return (
    <button
      className="btn btn-outline md:hidden"
      onClick={toggleMobileMenu}
      aria-pressed={mobileMenuOpen}
      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">
        {mobileMenuOpen ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </span>
    </button>
  );
}









