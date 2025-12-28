"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';
import { getSiteBilling, type SiteBillingData } from '@/lib/api';

export default function SiteBillingPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<SiteBillingData | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Site slug is required');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSiteBilling(slug);
        setBillingData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('billing.failedToLoadBillingData'));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/sites/${slug}`} className="text-sm text-muted hover:text-foreground">
              ← {t('common.backToSite')}
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{t('billing.title')}</h1>
        </div>

        <Card>
          <CardContent>
            <div className="py-8">
              <Skeleton variant="text" width={200} height={24} className="mb-4" />
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/sites/${slug}`} className="text-sm text-muted hover:text-foreground">
              ← {t('common.backToSite')}
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{t('billing.title')}</h1>
        </div>

        <Card>
          <CardContent>
            <div className="py-8 text-center">
              <EmptyState
                title={t('billing.errorLoadingBillingData')}
                description={error}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/sites/${slug}`} className="text-sm text-muted hover:text-foreground">
              ← {t('common.backToSite')}
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{t('billing.title')}</h1>
        </div>

        <Card>
          <CardContent>
            <div className="py-8 text-center">
              <EmptyState
                title={t('billing.noBillingDataAvailable')}
                description={t('billing.unableToLoadBillingInfo')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasSubscription = billingData.status !== 'none';
  const statusBadgeTone = billingData.status === 'active' ? 'success' : billingData.status === 'past_due' ? 'warning' : 'default';

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/sites/${slug}`} className="text-sm text-muted hover:text-foreground">
            ← Back to Site
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{t('billing.title')}</h1>
        <p className="text-sm text-muted mt-1">{t('billing.manageSubscriptionAndBilling')}</p>
      </div>

      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.currentPlan')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSubscription ? (
              <EmptyState
                title={t('billing.noActiveSubscription')}
                description={t('billing.freePlanDescription')}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-muted mb-1">{t('billing.plan')}</dt>
                    <dd className="text-lg font-semibold capitalize">{billingData.plan}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted mb-1">{t('billing.status')}</dt>
                    <dd className="text-lg">
                      <Badge tone={statusBadgeTone}>{billingData.status}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted mb-1">{t('billing.nextRenewal')}</dt>
                    <dd className="text-lg text-muted">
                      {billingData.renewalDate
                        ? new Date(billingData.renewalDate).toLocaleDateString()
                        : 'N/A'}
                    </dd>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => alert('Change plan feature coming soon (UI only)')}
                  >
                    {t('billing.changePlan')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.billingHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {billingData.invoices.length === 0 ? (
              <EmptyState
                title={t('billing.noPaymentHistory')}
                description={t('billing.invoicesWillAppear')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">{t('billing.date')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.amount')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-muted">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {typeof inv.amount === 'number'
                            ? `${inv.amount.toFixed(2)} ${inv.currency || 'USD'}`
                            : typeof inv.amount === 'string'
                            ? `${parseFloat(inv.amount).toFixed(2)} ${inv.currency || 'USD'}`
                            : `${inv.amount} ${inv.currency || 'USD'}`}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'open' ? 'warning' : 'default'}>
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
