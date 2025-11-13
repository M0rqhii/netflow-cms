"use client";

import { useUi } from '@/lib/ui';

export default function CollapseToggle() {
  const { sidebarCollapsed, toggleSidebar } = useUi();
  return (
    <button
      className="btn btn-outline"
      onClick={toggleSidebar}
      aria-pressed={sidebarCollapsed}
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : 'rotate-0'}`}>
        {/* Icon: chevron double */}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m11 17 5-5-5-5" />
          <path d="m7 17 5-5-5-5" />
        </svg>
      </span>
    </button>
  );
}
