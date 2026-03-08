"use client";

import { useEffect, useMemo, useState } from "react";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import {
  decodeAuthToken,
  getAuthToken,
  getDevFlags,
  getDevLogs,
  getDevRuntime,
  getDevWebhooks,
} from "@/lib/api";
import { timeAgo } from "@/lib/formatters";
import { readGlobalSearch, subscribeGlobalSearch } from "@/lib/shell";
import { useTranslations } from "@/hooks/useTranslations";

type DevRuntimeData = {
  profile: string;
  node: string;
  apiVersion: string;
  generatedAt: string;
  totals: {
    sites: number;
    users: number;
    emails: number;
    subscriptions: number;
    webhooks: number;
    featureOverrides: number;
  };
};

type DevWebhookData = {
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  lastStatus?: number;
  lastError?: string;
};

type DevFlagData = {
  id: string;
  siteId: string;
  siteName: string;
  key: string;
  enabled: boolean;
  createdAt: string;
};

type DevLogData = {
  id: string;
  timestamp: string;
  level: string;
  module: string;
  message: string;
  metadata?: Record<string, unknown>;
};

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin", "tenant_admin", "platform_admin"];

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatAgo(value?: string): string {
  if (!value) return "-";
  const dateValue = new Date(value).getTime();
  if (Number.isNaN(dateValue)) return "-";
  return timeAgo(dateValue);
}

function levelBadgeClass(level?: string): string {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "error") return "orange";
  if (normalized === "warn" || normalized === "warning") return "orange";
  if (normalized === "info" || normalized === "debug") return "blue";
  return "gray";
}

export type DevHubTab = "runtime" | "webhooks" | "logs" | "flags";

export function DevHub({ activeTab }: { activeTab: DevHubTab }) {
  const t = useTranslations();
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || "";
  const userPlatformRole = (payload?.platformRole as string) || "";
  const userSystemRole = (payload?.systemRole as string) || "";
  const isSuperAdmin = (payload?.isSuperAdmin as boolean) || false;
  const isPrivileged =
    PRIVILEGED_ROLES.includes(userRole) ||
    PRIVILEGED_ROLES.includes(userPlatformRole) ||
    isSuperAdmin ||
    userSystemRole === "super_admin";

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [runtimeData, setRuntimeData] = useState<DevRuntimeData | null>(null);
  const [webhooks, setWebhooks] = useState<DevWebhookData[]>([]);
  const [flags, setFlags] = useState<DevFlagData[]>([]);
  const [logs, setLogs] = useState<DevLogData[]>([]);

  useEffect(() => {
    setSearch(readGlobalSearch());
    return subscribeGlobalSearch((nextValue) => {
      setSearch(nextValue);
    });
  }, []);

  useEffect(() => {
    if (isProd || !isPrivileged) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "runtime") {
          const data = await getDevRuntime();
          if (!cancelled) setRuntimeData(data);
        }

        if (activeTab === "webhooks") {
          const data = await getDevWebhooks();
          if (!cancelled) setWebhooks(Array.isArray(data) ? data : []);
        }

        if (activeTab === "flags") {
          const data = await getDevFlags();
          if (!cancelled) setFlags(Array.isArray(data) ? data : []);
        }

        if (activeTab === "logs") {
          const data = await getDevLogs();
          if (!cancelled) setLogs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("devPanel.hub.toasts.failedToLoadDeveloperData"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isProd, isPrivileged, reloadKey, t]);

  const filteredWebhooks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return webhooks;
    return webhooks.filter((item) => {
      const blob = `${item.siteName} ${item.url} ${(item.events || []).join(" ")} ${item.active}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [search, webhooks]);

  const filteredFlags = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return flags;
    return flags.filter((item) => {
      const blob = `${item.siteName} ${item.key} ${item.enabled}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [search, flags]);

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((item) => {
      const blob = `${item.level} ${item.module} ${item.message}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [search, logs]);

  if (isProd && !isSuperAdmin) {
    return (
      <DevPanelLayout title={t("devPanel.hub.title")} description={t("devPanel.hub.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.disabledTitle")}</div>
          <div className="text-muted text-xs mt-1.5">{t("devPanel.common.nonProductionOnly")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.hub.title")} description={t("devPanel.hub.description")}>
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
    <DevPanelLayout
      title={t("devPanel.hub.title")}
      description={t("devPanel.hub.description")}
      headerActions={
        <button className="btn" type="button" onClick={() => setReloadKey((prev) => prev + 1)}>
          {t("devPanel.common.refresh")}
        </button>
      }
    >
      <DevPanelTabs />

      {error ? (
        <div className="error-alert">
          <div className="text-error text-sm">{error}</div>
        </div>
      ) : null}

      {activeTab === "runtime" && (
        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div>
              <div className="section-title">{t("devPanel.hub.runtime.title")}</div>
              <div className="text-muted text-xs mt-1.5">{t("devPanel.hub.runtime.subtitle")}</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">{t("devPanel.hub.runtime.env")}: {runtimeData?.profile || appProfile}</span>
              <span className="badge gray">{t("devPanel.hub.runtime.node")}: {runtimeData?.node || "-"}</span>
              <span className="badge gray">{t("devPanel.hub.runtime.api")}: {runtimeData?.apiVersion || "-"}</span>
            </div>
          </div>

          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">{t("devPanel.hub.runtime.loading")}</div>
          ) : !runtimeData ? (
            <div className="dev-empty-state">{t("devPanel.hub.runtime.notAvailable")}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.sites")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.sites}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.users")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.users}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.devEmails")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.emails}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.subscriptions")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.subscriptions}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.webhooks")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.webhooks}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">{t("devPanel.hub.runtime.cards.featureOverrides")}</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.featureOverrides}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div>
              <div className="section-title">{t("devPanel.hub.webhooks.title")}</div>
              <div className="text-muted text-xs mt-1.5">{t("devPanel.hub.webhooks.subtitle")}</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">{t("devPanel.common.rows")}: {filteredWebhooks.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">{t("devPanel.hub.webhooks.loading")}</div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="dev-empty-state">{t("devPanel.hub.webhooks.empty")}</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>{t("devPanel.hub.webhooks.columns.site")}</th>
                    <th>{t("devPanel.hub.webhooks.columns.url")}</th>
                    <th>{t("devPanel.hub.webhooks.columns.events")}</th>
                    <th>{t("devPanel.hub.webhooks.columns.status")}</th>
                    <th>{t("devPanel.hub.webhooks.columns.lastDelivery")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWebhooks.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.siteName}</td>
                      <td className="mono text-xs">{item.url}</td>
                      <td className="text-muted">{(item.events || []).join(", ") || "-"}</td>
                      <td>
                        <span className={item.active ? "badge green" : "badge gray"}>
                          {item.active ? t("devPanel.common.active") : t("devPanel.common.inactive")}
                        </span>
                      </td>
                      <td className="text-muted">
                        {item.lastDeliveryAt ? `${formatAgo(item.lastDeliveryAt)} (${item.lastStatus || "-"})` : "-"}
                        {item.lastError ? <div className="text-xs mt-1">{item.lastError}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "flags" && (
        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div>
              <div className="section-title">{t("devPanel.hub.flags.title")}</div>
              <div className="text-muted text-xs mt-1.5">{t("devPanel.hub.flags.subtitle")}</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">{t("devPanel.common.rows")}: {filteredFlags.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">{t("devPanel.hub.flags.loading")}</div>
          ) : filteredFlags.length === 0 ? (
            <div className="dev-empty-state">{t("devPanel.hub.flags.empty")}</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>{t("devPanel.hub.flags.columns.site")}</th>
                    <th>{t("devPanel.hub.flags.columns.flagKey")}</th>
                    <th>{t("devPanel.hub.flags.columns.status")}</th>
                    <th>{t("devPanel.hub.flags.columns.created")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlags.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.siteName}</td>
                      <td className="mono text-xs">{item.key}</td>
                      <td>
                        <span className={item.enabled ? "badge green" : "badge gray"}>
                          {item.enabled ? t("devPanel.common.enabled") : t("devPanel.common.disabled")}
                        </span>
                      </td>
                      <td className="text-muted">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div>
              <div className="section-title">{t("devPanel.hub.logs.title")}</div>
              <div className="text-muted text-xs mt-1.5">{t("devPanel.hub.logs.subtitle")}</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">{t("devPanel.common.rows")}: {filteredLogs.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">{t("devPanel.hub.logs.loading")}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="dev-empty-state">{t("devPanel.hub.logs.empty")}</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>{t("devPanel.hub.logs.columns.time")}</th>
                    <th>{t("devPanel.hub.logs.columns.level")}</th>
                    <th>{t("devPanel.hub.logs.columns.module")}</th>
                    <th>{t("devPanel.hub.logs.columns.message")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((item) => (
                    <tr key={item.id}>
                      <td className="text-muted">{formatDate(item.timestamp)}</td>
                      <td>
                        <span className={`badge ${levelBadgeClass(item.level)}`}>{String(item.level || "INFO").toUpperCase()}</span>
                      </td>
                      <td className="mono text-xs">{item.module || "-"}</td>
                      <td>{item.message || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DevPanelLayout>
  );
}
