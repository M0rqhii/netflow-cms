"use client";

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'nf-theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function getSystemPref(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem(THEME_KEY) as Theme)) || null;
    const initial: Theme = saved === 'dark' || saved === 'light' ? saved : getSystemPref();
    setTheme(initial);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'dark' || stored === 'light') return;
      const systemTheme: Theme = event.matches ? 'dark' : 'light';
      setTheme(systemTheme);
      applyTheme(systemTheme);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return;
      const next = event.newValue;
      if (next !== 'dark' && next !== 'light') return;
      setTheme(next);
      applyTheme(next);
    };

    media.addEventListener('change', onMediaChange);
    window.addEventListener('storage', onStorage);

    return () => {
      media.removeEventListener('change', onMediaChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, next);
    }
  };

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost w-9 h-9 p-0 flex items-center justify-center rounded-lg"
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        {/* Sun */}
        <svg
          className={`absolute h-[18px] w-[18px] transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        {/* Moon */}
        <svg
          className={`absolute h-[18px] w-[18px] transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
