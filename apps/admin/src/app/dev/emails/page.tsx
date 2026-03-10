"use client";

import { useEffect, useMemo, useState } from "react";
import { getDevEmails } from "@/lib/api";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

type DevEmailLog = {
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt?: string;
  createdAt?: string;
};

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getEmailStatusBadgeClass(status?: string): string {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "sent" || normalizedStatus === "delivered") return "badge green";
  if (normalizedStatus === "queued" || normalizedStatus === "pending" || normalizedStatus === "scheduled") {
    return "badge blue";
  }
  if (normalizedStatus === "failed" || normalizedStatus === "rejected" || normalizedStatus === "bounced") {
    return "badge orange";
  }
  return "badge gray";
}

export default function DevEmailsPage() {
  const t = useTranslations();
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const platformAccess = usePlatformAccess();
  const isPrivileged = platformAccess.canAccessDevTools;
  const [logs, setLogs] = useState<DevEmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevEmails()
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((e) => {
        const isForbidden =
          e instanceof Error &&
          (e.message.includes("403") ||
            e.message.includes("Forbidden") ||
            e.message.includes("Insufficient permissions"));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : t("devPanel.emails.toasts.failedToLoadEmailLogs"));
        }
      })
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged, t]);

  const sentCount = useMemo(
    () => logs.filter((entry) => ["sent", "delivered"].includes(String(entry.status).toLowerCase())).length,
    [logs],
  );
  const failedCount = useMemo(
    () => logs.filter((entry) => ["failed", "rejected", "bounced"].includes(String(entry.status).toLowerCase())).length,
    [logs],
  );
  const recipientCount = useMemo(() => new Set(logs.map((entry) => entry.to).filter(Boolean)).size, [logs]);
  const latestEventAt = useMemo(() => {
    const sortedDates = logs
      .map((entry) => entry.sentAt || entry.createdAt)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedDates[0];
  }, [logs]);

  if (isProd && !platformAccess.isSuperAdmin) {
    return (
      <DevPanelLayout title={t("devPanel.emails.title")} description={t("devPanel.emails.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.disabledTitle")}</div>
          <div className="text-muted text-xs mt-1.5">{t("devPanel.common.nonProductionOnly")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.emails.title")} description={t("devPanel.emails.description")}>
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
    <DevPanelLayout title={t("devPanel.emails.title")} description={t("devPanel.emails.description")}>
      <DevPanelTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.emails.kpis.events")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{logs.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.emails.kpis.sentDelivered")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{sentCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.emails.kpis.failed")}</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{failedCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("devPanel.emails.kpis.lastEvent")}</div>
          <div className="spacer-sm" />
          <div className="text-sm font-semibold">{formatDateTime(latestEventAt)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">{t("devPanel.emails.sectionTitle")}</div>
            <div className="text-muted text-xs mt-1.5">{t("devPanel.emails.sectionSubtitle")}</div>
          </div>
          <div className="row-wrap">
            <span className="badge gray">{t("devPanel.emails.recipients")}: {recipientCount}</span>
            <span className="badge blue">{t("devPanel.common.profile")}: {appProfile}</span>
          </div>
        </div>

        <div className="spacer-sm" />
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <LoadingSpinner text={t("devPanel.emails.loading")} />
          </div>
        ) : error ? (
          <div className="error-alert">
            <div className="text-error text-sm">{error}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.emails.empty")}</div>
        ) : (
          <div>
            <div className="grid gap-2 md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="card card-pad tight">
                  <div className="row-between">
                    <div className="font-semibold">{log.to || "-"}</div>
                    <span className={getEmailStatusBadgeClass(log.status)}>{log.status || "-"}</span>
                  </div>
                  <div className="spacer-sm" />
                  <div className="detail-label">{t("devPanel.emails.columns.subject")}</div>
                  <div className="text-sm">{log.subject || "-"}</div>
                  <div className="spacer-sm" />
                  <div className="detail-label">{t("devPanel.emails.columns.timestamp")}</div>
                  <div className="text-sm">{formatDateTime(log.sentAt || log.createdAt)}</div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto dev-table-wrap">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>{t("devPanel.emails.columns.recipient")}</th>
                    <th>{t("devPanel.emails.columns.subject")}</th>
                    <th>{t("devPanel.emails.columns.status")}</th>
                    <th>{t("devPanel.emails.columns.timestamp")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-semibold">{log.to || "-"}</td>
                      <td>{log.subject || "-"}</td>
                      <td>
                        <span className={getEmailStatusBadgeClass(log.status)}>{log.status || "-"}</span>
                      </td>
                      <td className="text-muted">{formatDateTime(log.sentAt || log.createdAt)}</td>
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
