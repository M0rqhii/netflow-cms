"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState, Skeleton } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMyTenants, getTenantSubscription, type Subscription } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';

export default function SiteOverviewPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [site, setSite] = useState<TenantInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sites = await fetchMyTenants();
        const current = sites.find((item) => item.tenant.slug === slug) || null;

        if (!current) {
          setNotFound(true);
          return;
        }

        setSite(current);
        const sub = await getTenantSubscription(current.tenantId).catch(() => null);
        setSubscription(sub);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const planLabel = subscription?.plan || site?.tenant.plan || 'free';
  const statusLabel = subscription?.status || 'active';

  if (loading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton variant="text" width={200} height={32} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={24} className="mb-4" />
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="text" width={120} height={16} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={24} className="mb-4" />
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="text" width={120} height={16} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Link href="/sites" className="text-sm text-muted hover:text-foreground">
            {t('siteOverview.backToSites')}
          </Link>
        </div>
        <EmptyState title={t('siteOverview.siteNotFound')} description={t('siteOverview.siteNotFoundDescription')} />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/sites" className="text-sm text-muted hover:text-foreground">
            {t('siteOverview.backToSites')}
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{site.tenant.name}</h1>
        <p className="text-sm text-muted mt-1">{t('siteOverview.siteOverviewAndQuickActions')}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge>{site.role}</Badge>
          <span className="text-sm text-muted">•</span>
          <span className="text-sm text-muted">{t('siteOverview.plan')}: {planLabel}</span>
          <span className="text-sm text-muted">•</span>
          <span className="text-sm text-muted">{t('siteOverview.status')}: {statusLabel}</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('siteOverview.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.name')}</dt>
                <dd className="font-medium">{site.tenant.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.slug')}</dt>
                <dd className="font-mono text-sm">{site.tenant.slug}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.tenantId')}</dt>
                <dd className="font-mono text-sm">{site.tenantId}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.plan')}</dt>
                <dd>{planLabel || t('sitesList.basic')}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.status')}</dt>
                <dd>{statusLabel || t('siteOverview.active')}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.created')}</dt>
                <dd>{(site as any)?.tenant?.createdAt ? new Date((site as any).tenant.createdAt).toLocaleString() : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.updated')}</dt>
                <dd>{(site as any)?.tenant?.updatedAt ? new Date((site as any).tenant.updatedAt).toLocaleString() : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t('siteOverview.yourRole')}</dt>
                <dd className="capitalize">{site.role}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('siteOverview.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href={`/sites/${encodeURIComponent(slug)}/panel/page-builder`} className="block">
                <Button variant="primary" className="w-full">
                  {t('siteOverview.editInBuilder') || 'Edytuj w builderze'}
                </Button>
              </Link>
              <Link href={`/sites/${encodeURIComponent(slug)}/panel`} className="block">
                <Button variant="outline" className="w-full">
                  {t('siteOverview.openSitePanel')}
                </Button>
              </Link>
              <Link href={`/sites/${encodeURIComponent(slug)}/panel/marketing`} className="block">
                <Button variant="outline" className="w-full">
                  {t('siteOverview.marketing') || 'Marketing'}
                </Button>
              </Link>
              <Link href={`/sites/${encodeURIComponent(slug)}/users`} className="block">
                <Button variant="outline" className="w-full">{t('siteOverview.manageUsers')}</Button>
              </Link>
              <Link href={`/sites/${encodeURIComponent(slug)}/plan`} className="block">
                <Button variant="outline" className="w-full">{t('sites.currentPlan')} & {t('sites.features')}</Button>
              </Link>
              <Link href={`/sites/${encodeURIComponent(slug)}/billing`} className="block">
                <Button variant="outline" className="w-full">{t('siteOverview.viewBilling')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
