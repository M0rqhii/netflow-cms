"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';

const actions = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview'] },
  { id: 'sites', label: 'Sites', href: '/sites', keywords: ['content', 'pages', 'projects'] },
  { id: 'account', label: 'Account', href: '/account', keywords: ['profile', 'settings'] },
  { id: 'billing', label: 'Billing', href: '/billing', keywords: ['plan', 'subscription', 'invoice'] },
  { id: 'dev', label: 'Dev Panel', href: '/dev', keywords: ['debug', 'providers'], devOnly: true },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isDev = (process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV) !== 'production';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions
      .filter((action) => (action.devOnly ? isDev : true))
      .filter((action) => {
        if (!q) return true;
        const haystack = [action.label, ...(action.keywords || [])].join(' ').toLowerCase();
        return haystack.includes(q);
      });
  }, [query, isDev]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCmdK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] animate-fade-in">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Command</span>
          <span className="ml-auto text-[11px] text-muted">{shortcutHint}</span>
        </div>
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, pages, or settings"
            className={clsx(
              'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          />
        </div>
        <div className="max-h-[45vh] overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted">No results. Try another keyword.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleSelect(action.href)}
                  className={clsx(
                    'w-full rounded-md px-3 py-2 text-left text-sm text-foreground',
                    'hover:bg-surface focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted">Go</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
