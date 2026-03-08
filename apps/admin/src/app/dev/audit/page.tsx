"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevAudit } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin", "tenant_admin", "platform_admin"];

type AuditEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  orgId: string | null;
  siteId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function actionBadge(action: string): string {
  if (action === "create" || action === "assign") return "green";
  if (action === "update") return "blue";
  if (action === "delete" || action === "revoke") return "orange";
  return "gray";
}

export default function DevAuditPage() {
  const t = useTranslations();
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes((payload?.role as string) || "") ||
    PRIVILEGED_ROLES.includes((payload?.platformRole as string) || "") ||
    isSuperAdmin ||
    (payload?.systemRole as string) === "super_admin";

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevAudit()
      .then((d) => { if (!cancelled) setEntries(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.audit.title")} description={t("devPanel.audit.description")}>
        <div className="card card-pad"><div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div></div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.audit.title")} description={t("devPanel.audit.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div className="section-title">{t("devPanel.audit.title")}</div>
          <span className="badge gray">{t("devPanel.common.rows")}: {entries.length}</span>
        </div>
        <div className="spacer-sm" />

        {loading ? (
          <div className="dev-empty-state">{t("devPanel.audit.loading")}</div>
        ) : entries.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.audit.empty")}</div>
        ) : (
          <div className="dev-table-wrap overflow-auto">
            <table className="table dev-table">
              <thead>
                <tr>
                  <th>{t("devPanel.audit.columns.time")}</th>
                  <th>{t("devPanel.audit.columns.action")}</th>
                  <th>{t("devPanel.audit.columns.entityType")}</th>
                  <th>{t("devPanel.audit.columns.entityId")}</th>
                  <th>{t("devPanel.audit.columns.actor")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-muted">{formatDate(entry.createdAt)}</td>
                    <td><span className={`badge ${actionBadge(entry.action)}`}>{entry.action}</span></td>
                    <td className="mono text-xs">{entry.entityType}</td>
                    <td className="mono text-xs">{entry.entityId.slice(0, 8)}...</td>
                    <td className="mono text-xs text-muted">{entry.actorUserId ? `${entry.actorUserId.slice(0, 8)}...` : "-"}</td>
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
