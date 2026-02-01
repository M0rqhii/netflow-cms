"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useTranslations } from '@/hooks/useTranslations';
import { getCurrentUser, getGlobalBillingInfo, type AccountInfo, type GlobalBillingInfo, type GlobalInvoice } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function BillingPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<GlobalInvoice[]>([]);
  const [organizations, setOrganizations] = useState<GlobalBillingInfo['organizations']>([]);
  const [currentUser, setCurrentUser] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillingData() {
      try {
        setLoading(true);
        setError(null);
        const [user, data] = await Promise.all([getCurrentUser(), getGlobalBillingInfo()]);
        setCurrentUser(user);
        setInvoices(data.invoices || []);
        setOrganizations(data.organizations || []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const isDemoAccount =
    currentUser?.email?.toLowerCase() === 'liwiusz01@gmail.com' &&
    organizations.some((org) => org.orgName?.toLowerCase() === 'platform admin');

  const demoOrg = organizations.find((org) => org.orgName?.toLowerCase() === 'platform admin');

  const demoHighlights = [
    { label: t('billing.organization'), value: demoOrg?.orgName ?? 'Platform Admin' },
    { label: t('billing.plan'), value: demoOrg?.plan ?? 'Developer Sandbox' },
    { label: t('billing.status'), value: demoOrg?.status ?? 'active' },
    { label: t('billing.nextRenewal'), value: t('billing.lifetime') },
  ];

  const demoUsage = [
    { label: 'Storage', value: 86, unit: 'GB', max: null },
    { label: 'Bandwidth', value: 320, unit: 'GB', max: null },
    { label: 'Build minutes', value: 1200, unit: 'min', max: null },
    { label: 'API calls', value: 86000, unit: '', max: null },
  ];

  const demoSpendSeries = [
    { month: 'Aug', value: 12 },
    { month: 'Sep', value: 24 },
    { month: 'Oct', value: 36 },
    { month: 'Nov', value: 28 },
    { month: 'Dec', value: 44 },
    { month: 'Jan', value: 32 },
  ];

  const demoHistory = [
    { id: 'demo-1', date: '2026-01-05', amount: 0, currency: 'USD', status: 'paid', note: 'Developer sandbox' },
    { id: 'demo-2', date: '2025-12-05', amount: 0, currency: 'USD', status: 'paid', note: 'Developer sandbox' },
    { id: 'demo-3', date: '2025-11-05', amount: 0, currency: 'USD', status: 'paid', note: 'Developer sandbox' },
    { id: 'demo-4', date: '2025-10-05', amount: 0, currency: 'USD', status: 'paid', note: 'Developer sandbox' },
  ];

  const demoMethods = [
    { label: 'Virtual card', value: '**** 4242', status: 'primary' },
    { label: 'Test transfer', value: 'Sandbox', status: 'backup' },
  ];

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
          <p className="text-xs sm:text-sm text-muted">
            {t('billing.manageOrganizationBilling')}
          </p>
        </div>

        {isDemoAccount && (
          <div className="space-y-3">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base font-semibold">{t('billing.demoAccountTitle')}</CardTitle>
                  <Badge tone="success" className="text-xs">{t('billing.unlimited')}</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  To konto deweloperskie ma domy\u015blnie pe\u0142ny dost\u0119p oraz przyk\u0142adow\u0105 wizualizacj\u0119 rozlicze\u0144.
                </p>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {demoHighlights.map((item) => (
                    <div key={item.label} className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <p className="text-xs text-muted">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>Limity: nielimitowane dzia\u0142ania, czas, projekty i \u015brodki dla cel\u00f3w testowych.</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Zu\u017cycie i limity (demo)</CardTitle>
                  <p className="text-xs sm:text-sm text-muted mt-1">Przyk\u0142adowe wykorzystanie zasob\u00f3w dla konta developerskiego.</p>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {demoUsage.map((metric) => {
                      const percent = metric.max ? Math.min(100, Math.round((metric.value / metric.max) * 100)) : 100;
                      const limitLabel = metric.max ? `${metric.max}${metric.unit ? ` ${metric.unit}` : ''}` : '\u221e';
                      return (
                        <div key={metric.label} className="rounded-lg border border-border/60 bg-background/60 p-3">
                          <div className="flex items-center justify-between text-xs text-muted mb-1">
                            <span>{metric.label}</span>
                            <span>{metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted">Limit: {limitLabel}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Aktywno\u015b\u0107 rozlicze\u0144 (demo)</CardTitle>
                  <p className="text-xs sm:text-sm text-muted mt-1">Symulowany trend aktywno\u015bci i koszt\u00f3w.</p>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="flex items-end gap-2 h-24">
                    {demoSpendSeries.map((item) => {
                      const maxValue = Math.max(...demoSpendSeries.map((s) => s.value));
                      const height = maxValue ? Math.max(8, Math.round((item.value / maxValue) * 80)) : 8;
                      return (
                        <div key={item.month} className="flex flex-col items-center gap-1">
                          <div className="w-6 rounded-md bg-emerald-500/80" style={{ height }} />
                          <span className="text-[10px] text-muted">{item.month}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted">Koszty sandbox: 0.00 USD (bez faktycznych obci\u0105\u017ce\u0144)</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Metody p\u0142atno\u015bci (demo)</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="space-y-2">
                    {demoMethods.map((method) => (
                      <div key={method.label} className="rounded-lg border border-border/60 bg-background/60 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted">{method.label}</p>
                          <p className="text-sm font-semibold">{method.value}</p>
                        </div>
                        <Badge tone={method.status === 'primary' ? 'success' : 'default'} className="text-xs">
                          {method.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">{t('billing.demoHistory')}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b border-border">
                          <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.date')}</th>
                          <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.amount')}</th>
                          <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.status')}</th>
                          <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.note')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoHistory.map((inv) => (
                          <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 text-xs sm:text-sm text-muted">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-xs sm:text-sm">{inv.amount} {inv.currency}</td>
                            <td className="py-2 px-3">
                              <Badge tone={inv.status === 'paid' ? 'success' : 'default'} className="text-xs">{inv.status}</Badge>
                            </td>
                            <td className="py-2 px-3 text-xs sm:text-sm text-muted">{inv.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="space-y-2 sm:space-y-3">
          {/* Organization plans */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
              <CardTitle className="text-sm sm:text-base font-semibold">{t('billing.organizationPlans')}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
              {loading ? (
                <div className="py-8">
                  <Skeleton variant="rectangular" width="100%" height={200} />
                </div>
              ) : organizations.length === 0 ? (
                <EmptyState
                  title={t('billing.noOrganizations')}
                  description={t('billing.organizationsWillAppear')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.organization')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.plan')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.status')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.nextRenewal')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.role')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.map((org) => (
                        <tr key={org.orgId} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 text-xs sm:text-sm">{org.orgName || '-'}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm">{org.plan}</td>
                          <td className="py-2 px-3">
                            <Badge tone={org.status === 'active' ? 'success' : org.status === 'past_due' ? 'warning' : 'default'} className="text-xs sm:text-xs">
                              {org.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-xs sm:text-sm text-muted">
                            {org.renewalDate ? new Date(org.renewalDate).toLocaleDateString() : t('billing.noRenewal')}
                          </td>
                          <td className="py-2 px-3 text-xs sm:text-sm text-muted">{org.role}</td>
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
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.organization')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.date')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.amount')}</th>
                        <th className="py-2 px-3 font-semibold text-xs sm:text-sm">{t('billing.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 px-3 text-xs sm:text-sm">{inv.organization?.name || '-'}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-xs sm:text-sm">{inv.amount} {inv.currency}</td>
                          <td className="py-2 px-3">
                            <Badge tone={inv.status === 'paid' ? 'success' : 'default'} className="text-xs sm:text-xs">
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
