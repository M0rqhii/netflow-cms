"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevInvites } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin", "tenant_admin", "platform_admin"];

type InviteItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  orgName: string;
  siteName: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

type InvitesData = {
  statusCounts: Record<string, number>;
  total: number;
  items: InviteItem[];
};

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusBadge(status: string): string {
  if (status === "accepted") return "green";
  if (status === "pending") return "blue";
  if (status === "expired" || status === "revoked") return "orange";
  return "gray";
}

export default function DevInvitesPage() {
  const t = useTranslations();
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes((payload?.role as string) || "") ||
    PRIVILEGED_ROLES.includes((payload?.platformRole as string) || "") ||
    isSuperAdmin ||
    (payload?.systemRole as string) === "super_admin";

  const [data, setData] = useState<InvitesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevInvites()
      .then((d) => { if (!cancelled) setData(d as InvitesData); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.invites.title")} description={t("devPanel.invites.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.invites.title")} description={t("devPanel.invites.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      {/* Status overview cards */}
      {data && Object.keys(data.statusCounts).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="card card-pad tight">
              <div className="detail-label">{status}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{count}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">{t("devPanel.invites.title")}</div>
          </div>
          <span className="badge gray">{t("devPanel.common.rows")}: {data?.items.length || 0}</span>
        </div>
        <div className="spacer-sm" />

        {loading ? (
          <div className="dev-empty-state">{t("devPanel.invites.loading")}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.invites.empty")}</div>
        ) : (
          <div className="dev-table-wrap overflow-auto">
            <table className="table dev-table">
              <thead>
                <tr>
                  <th>{t("devPanel.invites.columns.email")}</th>
                  <th>{t("devPanel.invites.columns.role")}</th>
                  <th>{t("devPanel.invites.columns.status")}</th>
                  <th>{t("devPanel.invites.columns.org")}</th>
                  <th>{t("devPanel.invites.columns.site")}</th>
                  <th>{t("devPanel.invites.columns.expires")}</th>
                  <th>{t("devPanel.invites.columns.created")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.email}</td>
                    <td className="mono text-xs">{item.role}</td>
                    <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                    <td>{item.orgName}</td>
                    <td className="text-muted">{item.siteName || "-"}</td>
                    <td className="text-muted">{formatDate(item.expiresAt)}</td>
                    <td className="text-muted">{formatDate(item.createdAt)}</td>
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
