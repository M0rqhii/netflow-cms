"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import { useTranslations } from '@/hooks/useTranslations';

export default function TenantCmsPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const slug = params?.slug as string | undefined;
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const tenants = await fetchMyTenants();
        const tenant = tenants.find((t) => t.tenant.slug === slug);
        setTenantInfo(tenant || null);
      } catch (e) {
        // Error handling is done in layout
        setTenantInfo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.slug]);

  if (loading) {
    return null; // Layout handles loading state
  }

  const slug = params?.slug as string;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← {t('dashboard.title')}
          </Link>
          <h1 className="text-xl font-bold">{tenantInfo?.tenant.name || slug}</h1>
          {tenantInfo && <span className="badge">{tenantInfo.role}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">{t('navigation.collections')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('dashboard.collections')}</p>
            <Link href={`/tenant/${encodeURIComponent(slug)}/collections`} className="btn btn-primary">{t('common.view')} {t('navigation.collections')}</Link>
          </div>
        </div>

        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">{t('navigation.contentTypes')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('navigation.contentTypes')}</p>
            <Link href={`/tenant/${encodeURIComponent(slug)}/types`} className="btn btn-primary">{t('common.view')} {t('navigation.contentTypes')}</Link>
          </div>
        </div>

        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">{t('navigation.media')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('media.title')}</p>
            <Link href={`/tenant/${encodeURIComponent(slug)}/media`} className="btn btn-primary">{t('common.view')} {t('navigation.media')}</Link>
          </div>
        </div>

        <div className="card card-interactive">
          <div className="card-body">
            <h3 className="font-semibold mb-2">{t('settings.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">Zarządzaj ustawieniami, planem i brandingiem</p>
            <Link href={`/tenant/${encodeURIComponent(slug)}/settings`} className="btn btn-primary">{t('common.view')} {t('settings.title')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
