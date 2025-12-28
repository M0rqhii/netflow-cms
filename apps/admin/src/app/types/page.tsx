"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * Redirect /types to /sites
 * Content Types are managed per-site in Site Panel (/tenant/[slug]/types)
 * This global page is deprecated - use Platform Panel (/sites) instead
 */
export default function TypesRedirectPage() {
  const router = useRouter();
  const t = useTranslations();
  
  useEffect(() => {
    // Redirect to sites page with message
    router.replace('/sites');
  }, [router]);

  return (
    <div className="container py-8">
      <div className="text-center">
        <p className="text-muted">{t('sites.sitePanelComingSoon')}</p>
        <p className="text-sm text-muted mt-2">{t('redirects.contentTypesManagedInSitePanel')}</p>
      </div>
    </div>
  );
}
