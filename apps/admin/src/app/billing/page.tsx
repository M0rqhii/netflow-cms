"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';
import { getGlobalBillingInfo, type Subscription, type Invoice } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function BillingPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillingData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getGlobalBillingInfo();
        setSubscriptions(data.subscriptions || []);
        setInvoices(data.invoices || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('billing.failedToLoadBillingData');
        setError(errorMessage);
        pushToast({
          message: errorMessage,
          tone: 'error',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBillingData();
  }, [pushToast]);

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">{t('billing.title')}</h1>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              <p className="font-semibold">{t('billing.errorLoadingBillingData')}</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">{t('billing.title')}</h1>

      <div className="space-y-6">
        {/* Active Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.currentPlans')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            ) : subscriptions.length === 0 ? (
              <EmptyState
                title={t('billing.noActiveSubscriptions')}
                description={t('billing.subscriptionsWillAppear')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">{t('billing.site')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.plan')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.status')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.nextRenewal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">{sub.tenant?.name || '-'}</td>
                        <td className="py-3 px-4">{sub.plan}</td>
                        <td className="py-3 px-4">
                          <Badge tone={sub.status === 'active' ? 'success' : 'default'}>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.paymentHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8">
                <Skeleton variant="rectangular" width="100%" height={200} />
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                title={t('billing.noPaymentHistory')}
                description={t('billing.invoicesWillAppear')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">{t('billing.site')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.date')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.amount')}</th>
                      <th className="py-3 px-4 font-semibold">{t('billing.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">{inv.tenant?.name || '-'}</td>
                        <td className="py-3 px-4 text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          {inv.amount} {inv.currency}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={inv.status === 'paid' ? 'success' : 'default'}>
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
