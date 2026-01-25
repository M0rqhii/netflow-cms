"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, EmptyState, Skeleton } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMySites, getSiteSubscription, type Subscription } from '@/lib/api';
import { trackOnboardingSuccess } from '@/lib/onboarding';
import type { SiteInfo } from '@repo/sdk';

export default function SiteOverviewPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [site, setSite] = useState<SiteInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sites = await fetchMySites();
        const current = sites.find((item) => item?.site?.slug === slug) || null;

        if (!current) {
          setNotFound(true);
          return;
        }

        setSite(current);
        // Load subscription in parallel (non-blocking)
        getSiteSubscription(current.siteId)
          .then(setSubscription)
          .catch(() => setSubscription(null));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    if (site) {
      trackOnboardingSuccess('project_opened');
    }
  }, [site]);

  const planLabel = useMemo(() => 
    subscription?.plan || site?.site.plan || 'free',
    [subscription?.plan, site?.site.plan]
  );
  const statusLabel = useMemo(() => 
    subscription?.status || 'active',
    [subscription?.status]
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="space-y-4">
            <Skeleton variant="text" width={200} height={32} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <Skeleton variant="text" width={150} height={24} className="mb-4" />
                  <Skeleton variant="text" width={100} height={16} />
                  <Skeleton variant="text" width={120} height={16} className="mt-2" />
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <Skeleton variant="text" width={150} height={24} className="mb-4" />
                  <Skeleton variant="text" width={100} height={16} />
                  <Skeleton variant="text" width={120} height={16} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-6">
            <Link href="/sites" className="text-sm text-muted hover:text-foreground">
              {t('siteOverview.backToSites')}
            </Link>
          </div>
          <EmptyState title={t('siteOverview.siteNotFound')} description={t('siteOverview.siteNotFoundDescription')} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/sites" className="text-xs sm:text-sm text-muted hover:text-foreground transition-colors">
              {'<- '} {t('siteOverview.backToSites')}
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
            {site.site.name}
          </h1>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5 sm:mb-2">
            <p className="text-xs sm:text-sm text-muted">
              {t('siteOverview.siteOverviewAndQuickActions')}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className="text-xs sm:text-sm">{site.role}</Badge>
              <span className="text-xs sm:text-sm text-muted">-</span>
              <span className="text-xs sm:text-sm text-muted">{t('siteOverview.plan')}: {planLabel}</span>
              <span className="text-xs sm:text-sm text-muted">-</span>
              <span className="text-xs sm:text-sm text-muted">
                {t('siteOverview.status')}: <span className={statusLabel === 'active' ? 'text-green-600 dark:text-green-400' : statusLabel === 'disabled' ? 'text-red-600 dark:text-red-400' : ''}>{statusLabel}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {/* Details Card */}
          <Card className="border-0 shadow-sm flex flex-col">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('siteOverview.details')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3 flex-1">
              <dl className="space-y-1.5 sm:space-y-2">
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.name')}</dt>
                  <dd className="font-medium text-xs sm:text-sm">{site.site.name}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.slug')}</dt>
                  <dd className="font-mono text-xs sm:text-sm">{site.site.slug}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.siteId')}</dt>
                  <dd className="font-mono text-xs sm:text-sm break-all">{site.siteId}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.plan')}</dt>
                  <dd className="text-xs sm:text-sm">{planLabel || t('sitesList.basic')}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.status')}</dt>
                  <dd className="text-xs sm:text-sm">{statusLabel || t('siteOverview.active')}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.created')}</dt>
                  <dd className="text-xs sm:text-sm">{(site as any)?.site?.createdAt ? new Date((site as any).site.createdAt).toLocaleString() : 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.updated')}</dt>
                  <dd className="text-xs sm:text-sm">{(site as any)?.site?.updatedAt ? new Date((site as any).site.updatedAt).toLocaleString() : 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs sm:text-sm text-muted mb-0.5">{t('siteOverview.yourRole')}</dt>
                  <dd className="capitalize text-xs sm:text-sm">{site.role}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-0 shadow-sm flex flex-col">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('siteOverview.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3 flex-1 flex flex-col">
              <div className="space-y-1 flex-1">
                <Link href={`/sites/${encodeURIComponent(slug)}/panel/pages`} className="block">
                  <Button variant="primary" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t('siteOverview.editInBuilder') || 'Edytuj w builderze'}
                  </Button>
                </Link>
                <Link href={`/sites/${encodeURIComponent(slug)}/panel`} className="block">
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {t('siteOverview.openSitePanel')}
                  </Button>
                </Link>
                <Link href={`/sites/${encodeURIComponent(slug)}/panel/marketing`} className="block">
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    {t('siteOverview.marketing') || 'Marketing'}
                  </Button>
                </Link>
                <Link href={`/sites/${encodeURIComponent(slug)}/users`} className="block">
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {t('siteOverview.manageUsers')}
                  </Button>
                </Link>
                <Link href={`/sites/${encodeURIComponent(slug)}/plan`} className="block">
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t('sites.currentPlan')} & {t('sites.features')}
                  </Button>
                </Link>
                <Link href={`/sites/${encodeURIComponent(slug)}/billing`} className="block">
                  <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-7 sm:h-8 px-2">
                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t('siteOverview.viewBilling')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

