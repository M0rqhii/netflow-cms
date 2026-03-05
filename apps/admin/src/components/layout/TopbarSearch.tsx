'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { publishGlobalSearch, readGlobalSearch, subscribeGlobalSearch } from '@/lib/shell';

export default function TopbarSearch() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(readGlobalSearch());
  }, []);

  useEffect(() => {
    return subscribeGlobalSearch((nextValue) => {
      setValue((prev) => (prev === nextValue ? prev : nextValue));
    });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      publishGlobalSearch(value);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [value]);

  const applySitesQuery = (query: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    const queryString = params.toString();
    router.replace(queryString ? `/sites?${queryString}` : '/sites');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setValue('');
      publishGlobalSearch('');
      return;
    }

    if (event.key !== 'Enter') return;

    event.preventDefault();
    const query = value.trim();
    publishGlobalSearch(query);

    if (pathname?.startsWith('/sites')) {
      applySitesQuery(query);
      return;
    }

    router.push(query ? `/sites?q=${encodeURIComponent(query)}` : '/sites');
  };

  return (
    <div className="topbar-search" role="search">
      <svg className="topbar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        <path d="M16.5 16.5 21 21" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('shell.searchPlaceholder')}
        aria-label={t('common.search')}
      />
    </div>
  );
}

