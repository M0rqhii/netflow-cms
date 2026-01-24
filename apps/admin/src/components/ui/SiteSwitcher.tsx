"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { SiteInfo } from '@repo/sdk';
import { useTranslations } from '@/hooks/useTranslations';
import { usePathname } from 'next/navigation';
import { useToast } from './Toast';
import { useSites } from '@/hooks/useSites';

export default function SiteSwitcher() {
  const t = useTranslations();
  const pathname = usePathname();
  const toast = useToast();
  const { sites, loading } = useSites();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSiteSelect = async (site: SiteInfo) => {
    // Redirect to Platform Panel site overview instead of Site Panel
    if (!site?.site?.slug) return;
    setIsOpen(false);
    window.location.href = `/sites/${site.site.slug}`;
  };

  // Extract current site from pathname if in site context (Platform Panel or Site Panel)
  const currentSiteSlug = pathname?.match(/\/sites\/([^/]+)/)?.[1];
  const currentSite = sites.find(s => s?.site?.slug === currentSiteSlug);

  if (loading || sites.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
        aria-label="Switch site"
      >
        <span className="font-medium truncate max-w-[80px] sm:max-w-none">
          {currentSite?.site?.name - t('navigation.sites')}
        </span>
        <svg
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-card border border-border rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {sites.length === 0 ? (
              <div className="p-3 text-xs sm:text-sm text-muted text-center">
                {t('sites.noSites')}
              </div>
            ) : (
              <>
                {sites.map((site) => {
                  if (!site?.site) return null;
                  return (
                    <button
                      key={site.siteId}
                      onClick={() => handleSiteSelect(site)}
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        currentSite?.siteId === site.siteId ? 'bg-gray-50 dark:bg-gray-800 font-medium' : ''
                      }`}
                    >
                      <div className="font-medium truncate">{site.site.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted truncate">{site.site.slug} - {site.role}</div>
                    </button>
                  );
                })}
                <div className="border-t border-border mt-2 pt-2">
                  <Link
                    href="/sites"
                    className="block px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('dashboard.viewAll')} {t('navigation.sites')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




