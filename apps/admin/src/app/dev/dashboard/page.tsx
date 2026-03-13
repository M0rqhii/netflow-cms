"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useState } from "react";
import { getDevDashboard } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

type DashboardData = {
  totals: { orgs: number; sites: number; users: number; media: number };
  growth: { orgs7d: number; orgs30d: number; sites7d: number; sites30d: number; users7d: number; users30d: number };
  plans: Record<string, number>;
  subscriptions: Record<string, number>;
  content: Record<string, number>;
  storage: { totalBytes: number; mediaCount: number };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DevDashboardPage() {
  const t = useTranslations();
  const platformAccess = usePlatformAccess();
  const isPrivileged = platformAccess.canAccessDevTools;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevDashboard()
      .then((d) => { if (!cancelled) setData(d as DashboardData); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.dashboard.title")} description={t("devPanel.dashboard.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
          <div className="text-muted text-xs mt-1.5">{t("devPanel.common.privilegedOnly")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout title={t("devPanel.dashboard.title")} description={t("devPanel.dashboard.description")}>
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      {loading ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.dashboard.loading")}</div></div>
      ) : !data ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.dashboard.empty")}</div></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.dashboard.kpis.organizations")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{data.totals.orgs}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.dashboard.kpis.sites")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{data.totals.sites}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.dashboard.kpis.users")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{data.totals.users}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.dashboard.kpis.media")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{data.totals.media}</div>
            </div>
          </div>

          {/* Growth */}
          <div className="card card-pad mt-3">
            <div className="section-title">{t("devPanel.dashboard.growth.title")}</div>
            <div className="spacer-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.dashboard.growth.orgs")}</div>
                <div className="spacer-sm" />
                <div className="text-lg font-bold">
                  <span className="text-green-600">+{data.growth.orgs7d}</span>
                  <span className="text-muted text-xs ml-2">7d</span>
                  <span className="mx-2 text-muted">/</span>
                  <span className="text-green-600">+{data.growth.orgs30d}</span>
                  <span className="text-muted text-xs ml-2">30d</span>
                </div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.dashboard.growth.sites")}</div>
                <div className="spacer-sm" />
                <div className="text-lg font-bold">
                  <span className="text-green-600">+{data.growth.sites7d}</span>
                  <span className="text-muted text-xs ml-2">7d</span>
                  <span className="mx-2 text-muted">/</span>
                  <span className="text-green-600">+{data.growth.sites30d}</span>
                  <span className="text-muted text-xs ml-2">30d</span>
                </div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.dashboard.growth.users")}</div>
                <div className="spacer-sm" />
                <div className="text-lg font-bold">
                  <span className="text-green-600">+{data.growth.users7d}</span>
                  <span className="text-muted text-xs ml-2">7d</span>
                  <span className="mx-2 text-muted">/</span>
                  <span className="text-green-600">+{data.growth.users30d}</span>
                  <span className="text-muted text-xs ml-2">30d</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Distribution & Subscriptions & Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
            <div className="card card-pad">
              <div className="section-title">{t("devPanel.dashboard.plans.title")}</div>
              <div className="spacer-sm" />
              {Object.entries(data.plans).map(([plan, count]) => (
                <div key={plan} className="row-between py-1">
                  <span className={`badge ${plan === "enterprise" ? "purple" : plan === "max" ? "gold" : plan === "pro" ? "green" : "gray"}`}>{plan.toUpperCase()}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(data.plans).length === 0 && <div className="text-muted text-xs">-</div>}
            </div>

            <div className="card card-pad">
              <div className="section-title">{t("devPanel.dashboard.subscriptions.title")}</div>
              <div className="spacer-sm" />
              {Object.entries(data.subscriptions).map(([status, count]) => (
                <div key={status} className="row-between py-1">
                  <span className={`badge ${["active", "trialing"].includes(status) ? "green" : status === "past_due" ? "orange" : "gray"}`}>{status}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(data.subscriptions).length === 0 && <div className="text-muted text-xs">-</div>}
            </div>

            <div className="card card-pad">
              <div className="section-title">{t("devPanel.dashboard.content.title")}</div>
              <div className="spacer-sm" />
              {Object.entries(data.content).map(([status, count]) => (
                <div key={status} className="row-between py-1">
                  <span className={`badge ${status === "PUBLISHED" ? "green" : status === "REVIEW" ? "blue" : "gray"}`}>{status}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(data.content).length === 0 && <div className="text-muted text-xs">-</div>}
            </div>
          </div>

          {/* Storage */}
          <div className="card card-pad mt-3">
            <div className="section-title">{t("devPanel.dashboard.storage.title")}</div>
            <div className="spacer-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="detail-label">{t("devPanel.dashboard.storage.totalBytes")}</div>
                <div className="text-lg font-bold">{formatBytes(data.storage.totalBytes)}</div>
              </div>
              <div>
                <div className="detail-label">{t("devPanel.dashboard.storage.mediaCount")}</div>
                <div className="text-lg font-bold">{data.storage.mediaCount}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </DevPanelLayout>
  );
}
