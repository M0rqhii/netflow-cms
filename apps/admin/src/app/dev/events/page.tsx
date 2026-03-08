"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevEvents } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin", "tenant_admin", "platform_admin"];

type EventData = {
  id: string;
  siteId: string;
  siteName: string;
  userId: string | null;
  type: string;
  message: string;
  createdAt: string;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function typeBadge(type: string): string {
  if (type.includes("publish") || type.includes("deploy")) return "green";
  if (type.includes("error") || type.includes("fail")) return "orange";
  if (type.includes("create") || type.includes("update")) return "blue";
  return "gray";
}

export default function DevEventsPage() {
  const t = useTranslations();
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes((payload?.role as string) || "") ||
    PRIVILEGED_ROLES.includes((payload?.platformRole as string) || "") ||
    isSuperAdmin ||
    (payload?.systemRole as string) === "super_admin";

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevEvents()
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.events.title")} description={t("devPanel.events.description")}>
        <div className="card card-pad"><div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div></div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.events.title")} description={t("devPanel.events.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div className="section-title">{t("devPanel.events.title")}</div>
          <span className="badge gray">{t("devPanel.common.rows")}: {events.length}</span>
        </div>
        <div className="spacer-sm" />

        {loading ? (
          <div className="dev-empty-state">{t("devPanel.events.loading")}</div>
        ) : events.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.events.empty")}</div>
        ) : (
          <div className="dev-table-wrap overflow-auto">
            <table className="table dev-table">
              <thead>
                <tr>
                  <th>{t("devPanel.events.columns.time")}</th>
                  <th>{t("devPanel.events.columns.site")}</th>
                  <th>{t("devPanel.events.columns.type")}</th>
                  <th>{t("devPanel.events.columns.message")}</th>
                  <th>{t("devPanel.events.columns.user")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="text-muted">{formatDate(event.createdAt)}</td>
                    <td className="font-semibold">{event.siteName}</td>
                    <td><span className={`badge ${typeBadge(event.type)}`}>{event.type}</span></td>
                    <td>{event.message}</td>
                    <td className="mono text-xs text-muted">{event.userId ? `${event.userId.slice(0, 8)}...` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DevPanelLayout>
  );
}
