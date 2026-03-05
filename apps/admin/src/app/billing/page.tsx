"use client";

import { useState, useEffect } from "react";
import { EmptyState, Skeleton } from "@repo/ui";
import { useTranslations } from "@/hooks/useTranslations";
import { getCurrentUser, getGlobalBillingInfo, type AccountInfo, type GlobalBillingInfo, type GlobalInvoice } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export default function BillingPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<GlobalInvoice[]>([]);
  const [organizations, setOrganizations] = useState<GlobalBillingInfo["organizations"]>([]);
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

  const isDemoAccount =
    currentUser?.email?.toLowerCase() === "liwiusz01@gmail.com" &&
    organizations.some((org) => org.orgName?.toLowerCase() === "platform admin");

  const demoOrg = organizations.find((org) => org.orgName?.toLowerCase() === "platform admin");

  const demoHighlights = [
    { label: t("billing.organization"), value: demoOrg?.orgName ?? "Platform Admin" },
    { label: t("billing.plan"), value: demoOrg?.plan ?? "Developer Sandbox" },
    { label: t("billing.status"), value: demoOrg?.status ?? "active" },
    { label: t("billing.nextRenewal"), value: t("billing.lifetime") },
  ];

  const demoUsage = [
    { label: "Storage", value: 86, unit: "GB", max: null },
    { label: "Bandwidth", value: 320, unit: "GB", max: null },
    { label: "Build minutes", value: 1200, unit: "min", max: null },
    { label: "API calls", value: 86000, unit: "", max: null },
  ];

  const demoSpendSeries = [
    { month: "Aug", value: 12 },
    { month: "Sep", value: 24 },
    { month: "Oct", value: 36 },
    { month: "Nov", value: 28 },
    { month: "Dec", value: 44 },
    { month: "Jan", value: 32 },
  ];

  const demoHistory = [
    { id: "demo-1", date: "2026-01-05", amount: 0, currency: "USD", status: "paid", note: "Developer sandbox" },
    { id: "demo-2", date: "2025-12-05", amount: 0, currency: "USD", status: "paid", note: "Developer sandbox" },
    { id: "demo-3", date: "2025-11-05", amount: 0, currency: "USD", status: "paid", note: "Developer sandbox" },
    { id: "demo-4", date: "2025-10-05", amount: 0, currency: "USD", status: "paid", note: "Developer sandbox" },
  ];

  const demoMethods = [
    { label: "Virtual card", value: "**** 4242", status: "primary" },
    { label: "Test transfer", value: "Sandbox", status: "backup" },
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
        <div className="view-title">{t("billing.title")}</div>
        <div className="view-sub">{t("billing.manageOrganizationBilling")}</div>
      </div>

      <div className="spacer" />

      {isDemoAccount && (
        <div>
          <div className="card card-pad">
            <div className="row-between" style={{ flexWrap: "wrap" }}>
              <div className="section-title">{t("billing.demoAccountTitle")}</div>
              <span className="badge green">{t("billing.unlimited")}</span>
            </div>
            <div className="text-muted text-xs mt-1.5">
              Demo account with full access and sample billing data.
            </div>
            <div className="spacer-sm" />
            <div className="grid cols-4">
              {demoHighlights.map((item) => (
                <div key={item.label} className="card card-pad tight">
                  <div className="detail-label">{item.label}</div>
                  <div className="font-extrabold mt-1.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="spacer" />

          <div className="grid cols-3">
            <div className="card card-pad">
              <div className="section-title">Usage and limits (demo)</div>
              <div className="text-muted text-xs mt-1.5">
                Sample resource usage for the demo account.
              </div>
              <div className="spacer-sm" />
              <div className="grid" style={{ gap: 10 }}>
                {demoUsage.map((metric) => {
                  const percent = metric.max ? Math.min(100, Math.round((metric.value / metric.max) * 100)) : 100;
                  const limitLabel = metric.max ? `${metric.max}${metric.unit ? ` ${metric.unit}` : ""}` : "infinite";
                  return (
                    <div key={metric.label} className="card" style={{ padding: 12, borderRadius: 16 }}>
                      <div className="row-between text-xs text-muted">
                        <span>{metric.label}</span>
                        <span>{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</span>
                      </div>
                      <div className="spacer-sm" />
                      <div style={{ height: 6, borderRadius: 999, background: "rgba(148,163,184,0.25)" }}>
                        <div style={{ height: 6, borderRadius: 999, width: `${percent}%`, background: "#10b981" }} />
                      </div>
                      <div className="text-muted mt-1.5" style={{ fontSize: 11 }}>Limit: {limitLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-title">Billing activity (demo)</div>
              <div className="text-muted text-xs mt-1.5">
                Simulated spend trend.
              </div>
              <div className="spacer-sm" />
              <div className="flex items-end gap-2" style={{ height: 90 }}>
                {demoSpendSeries.map((item) => {
                  const maxValue = Math.max(...demoSpendSeries.map((s) => s.value));
                  const height = maxValue ? Math.max(8, Math.round((item.value / maxValue) * 80)) : 8;
                  return (
                    <div key={item.month} className="flex flex-col items-center gap-1.5">
                      <div style={{ width: 20, borderRadius: 12, background: "rgba(16,185,129,0.8)", height }} />
                      <span className="text-muted" style={{ fontSize: 10 }}>{item.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-muted text-xs mt-2">Sandbox spend: 0.00 USD</div>
            </div>

            <div className="card card-pad">
              <div className="section-title">Payment methods (demo)</div>
              <div className="spacer-sm" />
              <div className="grid" style={{ gap: 10 }}>
                {demoMethods.map((method) => (
                  <div key={method.label} className="card row-between" style={{ padding: 12, borderRadius: 16 }}>
                    <div>
                      <div className="detail-label">{method.label}</div>
                      <div className="font-extrabold">{method.value}</div>
                    </div>
                    <span className={method.status === "primary" ? "badge green" : "badge gray"}>{method.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="spacer" />

          <div className="card card-pad">
            <div className="section-title">{t("billing.demoHistory")}</div>
            <div className="spacer-sm" />
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("billing.date")}</th>
                    <th>{t("billing.amount")}</th>
                    <th>{t("billing.status")}</th>
                    <th>{t("billing.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {demoHistory.map((inv) => (
                    <tr key={inv.id}>
                      <td className="text-muted">{new Date(inv.date).toLocaleDateString()}</td>
                      <td>{inv.amount} {inv.currency}</td>
                      <td>
                        <span className={inv.status === "paid" ? "badge green" : "badge gray"}>{inv.status}</span>
                      </td>
                      <td className="text-muted">{inv.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="spacer" />
        </div>
      )}

      <div className="card card-pad">
        <div className="section-title">{t("billing.organizationPlans")}</div>
        <div className="spacer-sm" />
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={200} />
        ) : organizations.length === 0 ? (
          <EmptyState title={t("billing.noOrganizations")} description={t("billing.organizationsWillAppear")} />
        ) : (
          <div className="overflow-x-auto">
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
                    <td>{org.plan}</td>
                    <td>
                      <span className={org.status === "active" ? "badge green" : org.status === "past_due" ? "badge orange" : "badge gray"}>
                        {org.status}
                      </span>
                    </td>
                    <td className="text-muted">
                      {org.renewalDate ? new Date(org.renewalDate).toLocaleDateString() : t("billing.noRenewal")}
                    </td>
                    <td className="text-muted">{org.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("billing.paymentHistory")}</div>
        <div className="spacer-sm" />
        {loading ? (
          <Skeleton variant="rectangular" width="100%" height={200} />
        ) : invoices.length === 0 ? (
          <EmptyState title={t("billing.noPaymentHistory")} description={t("billing.invoicesWillAppear")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("billing.organization")}</th>
                  <th>{t("billing.date")}</th>
                  <th>{t("billing.amount")}</th>
                  <th>{t("billing.status")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.organization?.name || "-"}</td>
                    <td className="text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>{inv.amount} {inv.currency}</td>
                    <td>
                      <span className={inv.status === "paid" ? "badge green" : "badge gray"}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
