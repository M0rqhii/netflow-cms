"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * Redirect /media to /sites
 * Media is managed per-site in Site Panel (/tenant/[slug]/media)
 * This global page is deprecated - use Platform Panel (/sites) instead
 */
export default function MediaRedirectPage() {
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
        <p className="text-sm text-muted mt-2">Media is managed in Site Panel (coming soon)</p>
      </div>
    </div>
  );
}
