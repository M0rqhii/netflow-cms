"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useState } from "react";
import { getDevOrganizations } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

type OrgData = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  stats: { users: number; sites: number; members: number; pendingInvites: number };
  subscription: { status: string; currentPeriodEnd: string | null } | null;
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function DevOrganizationsPage() {
  const t = useTranslations();
  const platformAccess = usePlatformAccess();
  const isPrivileged = platformAccess.canAccessDevTools;

  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevOrganizations()
      .then((d) => { if (!cancelled) setOrgs(Array.isArray(d) ? d : []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.organizations.title")} description={t("devPanel.organizations.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.organizations.title")} description={t("devPanel.organizations.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">{t("devPanel.organizations.title")}</div>
          </div>
          <span className="badge gray">{t("devPanel.common.rows")}: {orgs.length}</span>
        </div>
        <div className="spacer-sm" />

        {loading ? (
          <div className="dev-empty-state">{t("devPanel.organizations.loading")}</div>
        ) : orgs.length === 0 ? (
          <div className="dev-empty-state">{t("devPanel.organizations.empty")}</div>
        ) : (
          <div className="dev-table-wrap overflow-auto">
            <table className="table dev-table">
              <thead>
                <tr>
                  <th>{t("devPanel.organizations.columns.name")}</th>
                  <th>{t("devPanel.organizations.columns.slug")}</th>
                  <th>{t("devPanel.organizations.columns.plan")}</th>
                  <th>{t("devPanel.organizations.columns.sites")}</th>
                  <th>{t("devPanel.organizations.columns.users")}</th>
                  <th>{t("devPanel.organizations.columns.invites")}</th>
                  <th>{t("devPanel.organizations.columns.subscription")}</th>
                  <th>{t("devPanel.organizations.columns.created")}</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="font-semibold">{org.name}</td>
                    <td className="mono text-xs">{org.slug}</td>
                    <td>
                      <span className={`badge ${org.plan === "enterprise" ? "purple" : org.plan === "max" ? "gold" : org.plan === "pro" ? "green" : "gray"}`}>
                        {(org.plan || "free").toUpperCase()}
                      </span>
                    </td>
                    <td className="font-bold">{org.stats.sites}</td>
                    <td>{org.stats.users}</td>
                    <td>{org.stats.pendingInvites > 0 ? <span className="badge orange">{org.stats.pendingInvites}</span> : <span className="text-muted">0</span>}</td>
                    <td>
                      {org.subscription ? (
                        <span className={`badge ${["active", "trialing"].includes(org.subscription.status) ? "green" : org.subscription.status === "past_due" ? "orange" : "gray"}`}>
                          {org.subscription.status}
                        </span>
                      ) : <span className="text-muted">-</span>}
                    </td>
                    <td className="text-muted">{formatDate(org.createdAt)}</td>
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
