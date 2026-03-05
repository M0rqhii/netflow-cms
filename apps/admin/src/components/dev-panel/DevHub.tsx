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

export type DevHubTab = "runtime" | "api-keys" | "webhooks" | "logs" | "flags";

export function DevHub({ activeTab }: { activeTab: DevHubTab }) {
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
        setError(e instanceof Error ? e.message : "Failed to load developer data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isProd, isPrivileged, reloadKey]);

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
      <DevPanelLayout title="Developer" description="Internal visibility into development providers and environment">
        <div className="card card-pad">
          <div className="font-black">Dev Panel disabled</div>
          <div className="text-muted text-xs mt-1.5">Only available outside production.</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title="Developer" description="Internal visibility into development providers and environment">
        <div className="card card-pad">
          <div className="font-black">Access denied</div>
          <div className="text-muted text-xs mt-1.5">Only privileged users can access the Dev Panel.</div>
          <div className="spacer-sm" />
          <button className="btn" onClick={() => (window.location.href = "/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout
      title="Developer"
      description="Developer observability panel powered by backend data sources."
      headerActions={
        <button className="btn" type="button" onClick={() => setReloadKey((prev) => prev + 1)}>
          Refresh
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
              <div className="section-title">Runtime</div>
              <div className="text-muted text-xs mt-1.5">Environment and aggregate counters from backend.</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">env: {runtimeData?.profile || appProfile}</span>
              <span className="badge gray">node: {runtimeData?.node || "-"}</span>
              <span className="badge gray">api: {runtimeData?.apiVersion || "-"}</span>
            </div>
          </div>

          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">Loading runtime data...</div>
          ) : !runtimeData ? (
            <div className="dev-empty-state">Runtime data is not available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div className="card card-pad tight">
                <div className="detail-label">Sites</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.sites}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">Users</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.users}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">Dev emails</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.emails}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">Subscriptions</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.subscriptions}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">Webhooks</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.webhooks}</div>
              </div>
              <div className="card card-pad tight">
                <div className="detail-label">Feature overrides</div>
                <div className="spacer-sm" />
                <div className="text-xl font-extrabold leading-tight">{runtimeData.totals.featureOverrides}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "api-keys" && (
        <div className="card card-pad">
          <div className="section-title">API Keys</div>
          <div className="text-muted text-xs mt-1.5">
            This environment does not expose API keys via a dedicated backend model yet.
          </div>
          <div className="spacer-sm" />
          <div className="dev-empty-state">No factual API key dataset is currently available.</div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="card card-pad">
          <div className="row-between row-wrap">
            <div>
              <div className="section-title">Webhooks</div>
              <div className="text-muted text-xs mt-1.5">Read directly from the webhooks and webhook_deliveries tables.</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">rows: {filteredWebhooks.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">Loading webhooks...</div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="dev-empty-state">No webhooks found.</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>URL</th>
                    <th>Events</th>
                    <th>Status</th>
                    <th>Last delivery</th>
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
                          {item.active ? "ACTIVE" : "INACTIVE"}
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
              <div className="section-title">Feature overrides</div>
              <div className="text-muted text-xs mt-1.5">Read from site_feature_overrides.</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">rows: {filteredFlags.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">Loading feature overrides...</div>
          ) : filteredFlags.length === 0 ? (
            <div className="dev-empty-state">No feature overrides found.</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Flag key</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlags.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.siteName}</td>
                      <td className="mono text-xs">{item.key}</td>
                      <td>
                        <span className={item.enabled ? "badge green" : "badge gray"}>
                          {item.enabled ? "ENABLED" : "DISABLED"}
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
              <div className="section-title">Logs</div>
              <div className="text-muted text-xs mt-1.5">Recent backend logs from DebugService.</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">rows: {filteredLogs.length}</span>
            </div>
          </div>
          <div className="spacer-sm" />
          {loading ? (
            <div className="dev-empty-state">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="dev-empty-state">No logs found.</div>
          ) : (
            <div className="dev-table-wrap overflow-auto">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Module</th>
                    <th>Message</th>
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
