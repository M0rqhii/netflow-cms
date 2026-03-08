"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevSecurity } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin", "tenant_admin", "platform_admin"];

type SecurityData = {
  expiredInvites: number;
  pastDueSubscriptions: number;
  expiredPasswordTokens: number;
  failingWebhooksCount: number;
  failingWebhooks: Array<{ id: string; url: string; siteName: string }>;
  recentDeletions: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorUserId: string | null;
    createdAt: string;
  }>;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function DevSecurityPage() {
  const t = useTranslations();
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes((payload?.role as string) || "") ||
    PRIVILEGED_ROLES.includes((payload?.platformRole as string) || "") ||
    isSuperAdmin ||
    (payload?.systemRole as string) === "super_admin";

  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevSecurity()
      .then((d) => { if (!cancelled) setData(d as SecurityData); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.security.title")} description={t("devPanel.security.description")}>
        <div className="card card-pad"><div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div></div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.security.title")} description={t("devPanel.security.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      {loading ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.security.loading")}</div></div>
      ) : !data ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.security.empty")}</div></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.security.kpis.expiredInvites")}</div>
              <div className="spacer-sm" />
              <div className={`text-xl font-extrabold leading-tight ${data.expiredInvites > 0 ? "text-orange-600" : ""}`}>
                {data.expiredInvites}
              </div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.security.kpis.pastDueSubs")}</div>
              <div className="spacer-sm" />
              <div className={`text-xl font-extrabold leading-tight ${data.pastDueSubscriptions > 0 ? "text-orange-600" : ""}`}>
                {data.pastDueSubscriptions}
              </div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.security.kpis.expiredTokens")}</div>
              <div className="spacer-sm" />
              <div className={`text-xl font-extrabold leading-tight ${data.expiredPasswordTokens > 0 ? "text-orange-600" : ""}`}>
                {data.expiredPasswordTokens}
              </div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.security.kpis.failingWebhooks")}</div>
              <div className="spacer-sm" />
              <div className={`text-xl font-extrabold leading-tight ${data.failingWebhooksCount > 0 ? "text-orange-600" : ""}`}>
                {data.failingWebhooksCount}
              </div>
            </div>
          </div>

          {/* Failing Webhooks */}
          {data.failingWebhooks.length > 0 && (
            <div className="card card-pad mt-3">
              <div className="section-title">{t("devPanel.security.failingWebhooksList.title")}</div>
              <div className="spacer-sm" />
              <div className="dev-table-wrap overflow-auto">
                <table className="table dev-table">
                  <thead>
                    <tr>
                      <th>{t("devPanel.security.failingWebhooksList.columns.site")}</th>
                      <th>{t("devPanel.security.failingWebhooksList.columns.url")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failingWebhooks.map((w) => (
                      <tr key={w.id}>
                        <td className="font-semibold">{w.siteName}</td>
                        <td className="mono text-xs">{w.url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Deletions */}
          <div className="card card-pad mt-3">
            <div className="section-title">{t("devPanel.security.recentDeletions.title")}</div>
            <div className="spacer-sm" />
            {data.recentDeletions.length === 0 ? (
              <div className="text-muted text-xs">No recent deletions or revocations.</div>
            ) : (
              <div className="dev-table-wrap overflow-auto">
                <table className="table dev-table">
                  <thead>
                    <tr>
                      <th>{t("devPanel.security.recentDeletions.columns.time")}</th>
                      <th>{t("devPanel.security.recentDeletions.columns.action")}</th>
                      <th>{t("devPanel.security.recentDeletions.columns.entityType")}</th>
                      <th>{t("devPanel.security.recentDeletions.columns.entityId")}</th>
                      <th>{t("devPanel.security.recentDeletions.columns.actor")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentDeletions.map((d) => (
                      <tr key={d.id}>
                        <td className="text-muted">{formatDate(d.createdAt)}</td>
                        <td><span className="badge orange">{d.action}</span></td>
                        <td className="mono text-xs">{d.entityType}</td>
                        <td className="mono text-xs">{d.entityId.slice(0, 8)}...</td>
                        <td className="mono text-xs text-muted">{d.actorUserId ? `${d.actorUserId.slice(0, 8)}...` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DevPanelLayout>
  );
}
