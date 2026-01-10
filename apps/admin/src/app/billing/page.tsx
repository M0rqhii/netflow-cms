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
  }, [pushToast, t]);

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-6">{t('billing.title')}</h1>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="font-semibold text-sm sm:text-base">{t('billing.errorLoadingBillingData')}</p>
                <p className="text-xs sm:text-sm mt-2">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
            {t('billing.title')}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted">
            Zarządzaj subskrypcjami i historią płatności
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* Active Subscriptions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('billing.currentPlans')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
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
                      <tr className="text-left text-muted border-b border-border">
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.site')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.plan')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.status')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.nextRenewal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub) => (
                        <tr key={sub.id} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 px-3 text-xs sm:text-sm">{sub.site?.name || '-'}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm">{sub.plan}</td>
                          <td className="py-2 px-3">
                            <Badge tone={sub.status === 'active' ? 'success' : 'default'} className="text-[9px] sm:text-[10px]">
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-xs sm:text-sm text-muted">
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('billing.paymentHistory')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
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
                      <tr className="text-left text-muted border-b border-border">
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.site')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.date')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.amount')}</th>
                        <th className="py-2 px-3 font-semibold text-[10px] sm:text-xs">{t('billing.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 px-3 text-xs sm:text-sm">{inv.site?.name || '-'}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm">
                            {inv.amount} {inv.currency}
                          </td>
                          <td className="py-2 px-3">
                            <Badge tone={inv.status === 'paid' ? 'success' : 'default'} className="text-[9px] sm:text-[10px]">
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
    </div>
  );
}
