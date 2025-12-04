"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * Redirect /users to /sites
 * Users are managed per-site in Site Panel (/tenant/[slug]/users) or Platform Panel (/sites/[slug]/users)
 * This global page is deprecated - use Platform Panel (/sites) instead
 */
export default function UsersRedirectPage() {
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
        <p className="text-sm text-muted mt-2">Users are managed per-site in Platform Panel (/sites/[slug]/users)</p>
      </div>
    </div>
  );
}
