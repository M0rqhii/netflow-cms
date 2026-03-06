"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevPayments } from "@/lib/api";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useTranslations } from "@/hooks/useTranslations";
import { formatPlanTierLabel } from "@/lib/plans";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin"];
const PRIVILEGED_PLATFORM_ROLES = ["platform_admin"];

type DevPaymentEvent = {
  id: string;
  orgId: string;
  plan?: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  createdAt?: string;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getStatusBadgeClass(status?: string): string {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "active" || normalizedStatus === "trialing" || normalizedStatus === "paid") {
    return "badge green";
  }
  if (normalizedStatus === "past_due" || normalizedStatus === "pending" || normalizedStatus === "unpaid") {
    return "badge orange";
  }
  return "badge gray";
}

export default function DevPaymentsPage() {
  const t = useTranslations();
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || "";
  const userPlatformRole = (payload?.platformRole as string) || "";
  const isSuperAdmin = Boolean(payload?.isSuperAdmin) || userRole === "super_admin";
  const isPrivileged =
    isSuperAdmin || PRIVILEGED_ROLES.includes(userRole) || PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);
  const [payments, setPayments] = useState<DevPaymentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevPayments()
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch((e) => {
        const isForbidden =
          e instanceof Error &&
          (e.message.includes("403") ||
            e.message.includes("Forbidden") ||
            e.message.includes("Insufficient permissions"));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : t("devPanel.payments.toasts.failedToLoadPaymentEvents"));
        }
      })
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged, t]);

  const activeCount = useMemo(
    () => payments.filter((payment) => ["active", "trialing"].includes(String(payment.status).toLowerCase())).length,
    [payments],
  );
  const endedCount = useMemo(
    () => payments.filter((payment) => ["canceled", "cancelled", "inactive", "expired"].includes(String(payment.status).toLowerCase())).length,
    [payments],
  );
  const uniqueOrgs = useMemo(() => new Set(payments.map((payment) => payment.orgId).filter(Boolean)).size, [payments]);
  const nextRenewal = useMemo(() => {
    const dates = payments
      .map((payment) => payment.currentPeriodEnd)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates[0];
  }, [payments]);

  if (isProd && !isSuperAdmin) {
    return (
      <DevPanelLayout title={t("devPanel.payments.title")} description={t("devPanel.payments.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.disabledTitle")}</div>
          <div className="text-muted text-xs mt-1.5">{t("devPanel.common.nonProductionOnly")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.payments.title")} description={t("devPanel.payments.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
          <div className="text-muted text-xs mt-1.5">{t("devPanel.common.privilegedOnly")}</div>
          <div className="spacer-sm" />
          <button className="btn" onClick={() => (window.location.href = "/dashboard")}>
            {t("devPanel.common.backToDashboard")}
          </button>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.payments.title")} description={t("devPanel.payments.description")}>
      <DevPanelTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.payments.kpis.events")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{payments.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.payments.kpis.activeTrialing")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{activeCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.payments.kpis.ended")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{endedCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.payments.kpis.nextRenewal")}</div>
          <div className="spacer-sm" />
          <div className="text-sm font-semibold">{formatDate(nextRenewal)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">{t("devPanel.payments.sectionTitle")}</div>
            <div className="text-muted text-xs mt-1.5">{t("devPanel.payments.sectionSubtitle")}</div>
          </div>
          <div className="row-wrap">
            <span className="badge gray">{t("devPanel.payments.orgs")}: {uniqueOrgs}</span>
            <span className="badge blue">{t("devPanel.common.profile")}: {appProfile}</span>
          </div>
        </div>

        <div className="spacer-sm" />
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <LoadingSpinner text={t("devPanel.payments.loading")} />
          </div>
        ) : error ? (
          <div className="error-alert">
            <div className="text-error text-sm">{error}</div>
          </div>
        ) : payments.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.payments.empty")}</div>
        ) : (
          <div>
            <div className="grid gap-2 md:hidden">
              {payments.map((event) => (
                <div key={event.id} className="card card-pad tight">
                  <div className="row-between">
                    <div className="font-semibold">{formatPlanTierLabel(event.plan)}</div>
                    <span className={getStatusBadgeClass(event.status)}>{event.status || "-"}</span>
                  </div>
                  <div className="spacer-sm" />
                  <div className="detail-label">{t("devPanel.payments.columns.organization")}</div>
                  <div className="mono text-xs">{event.orgId || "-"}</div>
                  <div className="spacer-sm" />
                  <div className="detail-label">{t("devPanel.payments.columns.period")}</div>
                  <div className="text-sm">{`${formatDate(event.currentPeriodStart)} -> ${formatDate(event.currentPeriodEnd)}`}</div>
                  <div className="spacer-sm" />
                  <div className="detail-label">{t("devPanel.payments.columns.created")}</div>
                  <div className="text-sm">{formatDateTime(event.createdAt)}</div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto dev-table-wrap">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>{t("devPanel.payments.columns.plan")}</th>
                    <th>{t("devPanel.payments.columns.orgId")}</th>
                    <th>{t("devPanel.payments.columns.status")}</th>
                    <th>{t("devPanel.payments.columns.periodStart")}</th>
                    <th>{t("devPanel.payments.columns.periodEnd")}</th>
                    <th>{t("devPanel.payments.columns.created")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((event) => (
                    <tr key={event.id}>
                      <td className="font-semibold">{formatPlanTierLabel(event.plan)}</td>
                      <td className="mono text-xs">{event.orgId || "-"}</td>
                      <td>
                        <span className={getStatusBadgeClass(event.status)}>{event.status || "-"}</span>
                      </td>
                      <td className="text-muted">{formatDate(event.currentPeriodStart)}</td>
                      <td className="text-muted">{formatDate(event.currentPeriodEnd)}</td>
                      <td className="text-muted">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DevPanelLayout>
  );
}
