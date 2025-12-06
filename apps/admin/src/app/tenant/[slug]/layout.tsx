"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createApiClient } from '@repo/sdk';
import { getAuthToken, getTenantToken, setTenantToken, fetchMyTenants } from '@/lib/api';
import { setLastTenantSlug } from '@/lib/prefs';
import type { TenantInfo } from '@repo/sdk';
import { useTranslations } from '@/hooks/useTranslations';
import Link from 'next/link';
import { LoadingSpinner } from '@repo/ui';

/**
 * Layout for tenant routes
 * Handles tenant token exchange and validation
 * Provides tenant context to all child routes
 */
export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        if (!tenant) {
          setError(t('errors.notFound'));
          setLoading(false);
          return;
        }

        setTenantInfo(tenant);
        setLastTenantSlug(tenant.tenant.slug);

        const existingToken = getTenantToken(tenant.tenantId);
        if (existingToken) {
          setHasToken(true);
          setLoading(false);
          return;
        }

        const global = getAuthToken();
        if (!global) {
          window.location.href = '/login';
          return;
        }

        try {
          const api = createApiClient();
          const res = await api.issueTenantToken(global, tenant.tenantId);
          setTenantToken(tenant.tenantId, res.access_token);
          setHasToken(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : t('errors.generic'));
          setHasToken(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errors.generic'));
        setHasToken(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.slug, t]);

  if (loading) {
    return (
      <div className="container py-8">
        <LoadingSpinner text={t('common.loading')} />
      </div>
    );
  }

  if (!hasToken || error) {
    return (
      <div className="container py-8">
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
          ← {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold mb-2 mt-4">CMS: {params?.slug}</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {!error && (
          <p className="text-red-600 mb-4">{t('errors.generic')}</p>
        )}
        <Link href="/dashboard" className="btn btn-primary inline-block">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}


