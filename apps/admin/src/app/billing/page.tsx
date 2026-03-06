"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState, Skeleton } from "@repo/ui";
import { useTranslations } from "@/hooks/useTranslations";
import {
  getCurrentUser,
  getGlobalBillingInfo,
  type AccountInfo,
  type GlobalBillingInfo,
  type GlobalInvoice,
  type GlobalSubscription,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { formatPlanTierLabel } from "@/lib/plans";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatStatus(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(amount: unknown, currency: string | null | undefined): string {
  const normalizedAmount = normalizeAmount(amount);
  const normalizedCurrency = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(normalizedAmount);
  } catch {
    return `${normalizedAmount.toFixed(2)} ${normalizedCurrency}`;
  }
}

function getStatusBadgeClass(status: string | null | undefined): string {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid" || normalized === "active" || normalized === "trialing") return "badge green";
  if (normalized === "open" || normalized === "draft" || normalized === "pending") return "badge orange";
  return "badge gray";
}

function MobileLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="row-between" style={{ alignItems: "flex-start" }}>
      <span className="detail-label">{label}</span>
      <span className="text-sm font-semibold text-right" style={{ maxWidth: "62%" }}>
        {value}
      </span>
    </div>
  );
}

export default function BillingPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AccountInfo | null>(null);
  const [billing, setBilling] = useState<GlobalBillingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillingData() {
      try {
        setLoading(true);
        setError(null);
        const [userResult, billingResult] = await Promise.allSettled([
          getCurrentUser(),
          getGlobalBillingInfo(),
        ]);

        if (userResult.status === "fulfilled") {
          setCurrentUser(userResult.value);
        }

        if (billingResult.status === "rejected") {
          throw billingResult.reason;
        }

        setBilling(billingResult.value);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t("billing.failedToLoadBillingData");
        setError(errorMessage);
        pushToast({
          message: errorMessage,
          tone: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const organizations = billing?.organizations || [];
  const subscriptions = billing?.subscriptions || [];
  const invoices = billing?.invoices || [];

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => ["active", "trialing"].includes(sub.status?.toLowerCase())).length,
    [subscriptions],
  );

  const openInvoices = useMemo(
    () => invoices.filter((inv) => ["open", "draft", "pending", "uncollectible"].includes(inv.status?.toLowerCase())).length,
    [invoices],
  );

  const paidTotal = useMemo(
    () =>
      invoices.reduce((sum, inv) => {
        if ((inv.status || "").toLowerCase() !== "paid") return sum;
        return sum + normalizeAmount(inv.amount);
      }, 0),
    [invoices],
  );

  const mainCurrency = useMemo(() => {
    const candidate =
      invoices.find((inv) => typeof inv.currency === "string" && inv.currency.length >= 3)?.currency || "USD";
    return candidate.toUpperCase();
  }, [invoices]);

  const latestRenewal = useMemo(() => {
    const allRenewals = organizations
      .map((org) => org.renewalDate)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    return allRenewals[0]?.toISOString() || null;
  }, [organizations]);

  const summaryCards = [
    { label: t("billing.organizationPlans"), value: String(organizations.length) },
    { label: t("billing.currentPlans"), value: String(activeSubscriptions) },
    { label: t("billing.openInvoices"), value: String(openInvoices) },
    { label: t("billing.paidTotal"), value: formatCurrency(paidTotal, mainCurrency) },
  ];

  if (error) {
    return (
      <div className="billing-page-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
        <div className="billing-page-shell">
          <div className="card card-pad">
            <div className="view-title">{t("billing.title")}</div>
            <div className="spacer-sm" />
            <div className="error-alert">
              <div className="text-error text-sm">{t("billing.errorLoadingBillingData")}</div>
              <div className="text-error text-xs mt-1.5">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-page-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <div className="billing-page-shell">
        <div className="card card-pad">
          <div className="row-start flex-wrap">
            <div>
              <div className="view-title">{t("billing.title")}</div>
              <div className="view-sub">{t("billing.manageOrganizationBilling")}</div>
            </div>
            <div className="row-wrap">
              {currentUser?.email && <span className="badge gray">{currentUser.email}</span>}
              <span className="badge blue">{`${t("billing.organization")}: ${organizations.length}`}</span>
              <span className="badge gray">
                {`${t("billing.nextRenewal")}: ${latestRenewal ? formatDate(latestRenewal) : t("billing.noRenewal")}`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="card card-pad">
                  <Skeleton variant="text" width={100} height={16} />
                  <div className="spacer-sm" />
                  <Skeleton variant="text" width={140} height={28} />
                </div>
              ))
            : summaryCards.map((card) => (
                <div key={card.label} className="card card-pad tight">
                  <div className="detail-label">{card.label}</div>
                  <div className="spacer-sm" />
                  <div className="text-xl font-extrabold leading-tight">{card.value}</div>
                </div>
              ))}
        </div>

        <div className="card card-pad">
          <div className="section-title">{t("billing.organizationPlans")}</div>
          <div className="spacer-sm" />
          {loading ? (
            <Skeleton variant="rectangular" width="100%" height={220} />
          ) : organizations.length === 0 ? (
            <EmptyState title={t("billing.noOrganizations")} description={t("billing.organizationsWillAppear")} />
          ) : (
            <div>
              <div className="grid gap-2 md:hidden">
                {organizations.map((org) => (
                  <div key={org.orgId} className="card card-pad tight">
                    <div className="row-between">
                      <div className="font-semibold">{org.orgName || "-"}</div>
                      <span className={getStatusBadgeClass(org.status)}>{formatStatus(org.status)}</span>
                    </div>
                    <div className="spacer-sm" />
                    <MobileLine label={t("billing.plan")} value={formatPlanTierLabel(org.plan)} />
                    <MobileLine label={t("billing.nextRenewal")} value={org.renewalDate ? formatDate(org.renewalDate) : t("billing.noRenewal")} />
                    <MobileLine label={t("billing.role")} value={org.role || "-"} />
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("billing.organization")}</th>
                    <th>{t("billing.plan")}</th>
                    <th>{t("billing.status")}</th>
                    <th>{t("billing.nextRenewal")}</th>
                    <th>{t("billing.role")}</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.orgId}>
                      <td>{org.orgName || "-"}</td>
                      <td>{formatPlanTierLabel(org.plan)}</td>
                      <td>
                        <span className={getStatusBadgeClass(org.status)}>{formatStatus(org.status)}</span>
                      </td>
                      <td className="text-muted">{org.renewalDate ? formatDate(org.renewalDate) : t("billing.noRenewal")}</td>
                      <td className="text-muted">{org.role || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="section-title">{t("billing.currentPlans")}</div>
          <div className="spacer-sm" />
          {loading ? (
            <Skeleton variant="rectangular" width="100%" height={220} />
          ) : subscriptions.length === 0 ? (
            <EmptyState title={t("billing.noActiveSubscriptions")} description={t("billing.subscriptionsWillAppear")} />
          ) : (
            <div>
              <div className="grid gap-2 md:hidden">
                {subscriptions.map((sub: GlobalSubscription) => {
                  const orgName = sub.organization?.name || organizations.find((org) => org.orgId === sub.orgId)?.orgName || "-";
                  return (
                    <div key={sub.id} className="card card-pad tight">
                      <div className="row-between">
                        <div className="font-semibold">{orgName}</div>
                        <span className={getStatusBadgeClass(sub.status)}>{formatStatus(sub.status)}</span>
                      </div>
                      <div className="spacer-sm" />
                      <MobileLine label={t("billing.plan")} value={formatPlanTierLabel(sub.plan)} />
                      <MobileLine label={t("billing.date")} value={formatDate(sub.currentPeriodStart)} />
                      <MobileLine label={t("billing.nextRenewal")} value={sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : t("billing.noRenewal")} />
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("billing.organization")}</th>
                    <th>{t("billing.plan")}</th>
                    <th>{t("billing.status")}</th>
                    <th>{t("billing.date")}</th>
                    <th>{t("billing.nextRenewal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub: GlobalSubscription) => (
                    <tr key={sub.id}>
                      <td>{sub.organization?.name || organizations.find((org) => org.orgId === sub.orgId)?.orgName || "-"}</td>
                      <td>{formatPlanTierLabel(sub.plan)}</td>
                      <td>
                        <span className={getStatusBadgeClass(sub.status)}>{formatStatus(sub.status)}</span>
                      </td>
                      <td className="text-muted">{formatDate(sub.currentPeriodStart)}</td>
                      <td className="text-muted">{sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : t("billing.noRenewal")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="section-title">{t("billing.paymentHistory")}</div>
          <div className="spacer-sm" />
          {loading ? (
            <Skeleton variant="rectangular" width="100%" height={220} />
          ) : invoices.length === 0 ? (
            <EmptyState title={t("billing.noPaymentHistory")} description={t("billing.invoicesWillAppear")} />
          ) : (
            <div>
              <div className="grid gap-2 md:hidden">
                {invoices.map((inv: GlobalInvoice) => {
                  const orgName = inv.organization?.name || organizations.find((org) => org.orgId === inv.orgId)?.orgName || "-";
                  return (
                    <div key={inv.id} className="card card-pad tight">
                      <div className="row-between">
                        <div className="font-semibold">{orgName}</div>
                        <span className={getStatusBadgeClass(inv.status)}>{formatStatus(inv.status)}</span>
                      </div>
                      <div className="spacer-sm" />
                      <MobileLine label={t("billing.invoiceNumber")} value={inv.invoiceNumber || "-"} />
                      <MobileLine label={t("billing.date")} value={formatDate(inv.createdAt)} />
                      <MobileLine label={t("billing.amount")} value={formatCurrency(inv.amount, inv.currency)} />
                      <MobileLine label={t("billing.paidAt")} value={formatDate(inv.paidAt)} />
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("billing.organization")}</th>
                    <th>{t("billing.invoiceNumber")}</th>
                    <th>{t("billing.date")}</th>
                    <th>{t("billing.amount")}</th>
                    <th>{t("billing.status")}</th>
                    <th>{t("billing.paidAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: GlobalInvoice) => (
                    <tr key={inv.id}>
                      <td>{inv.organization?.name || organizations.find((org) => org.orgId === inv.orgId)?.orgName || "-"}</td>
                      <td className="text-muted">{inv.invoiceNumber || "-"}</td>
                      <td className="text-muted">{formatDate(inv.createdAt)}</td>
                      <td>{formatCurrency(inv.amount, inv.currency)}</td>
                      <td>
                        <span className={getStatusBadgeClass(inv.status)}>{formatStatus(inv.status)}</span>
                      </td>
                      <td className="text-muted">{formatDate(inv.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
