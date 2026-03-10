"use client";

import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";
import { useEffect, useState } from "react";
import { getDevPerformance } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

type PerfData = {
  cache: { hits: number; misses: number; hitRate: number };
  slowQueries: Array<{ key: string; count: number; avgTime: number; totalTime: number }>;
  topQueries: Array<{ key: string; count: number; avgTime: number; totalTime: number }>;
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number };
  uptime: number;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(" ");
}

export default function DevPerformancePage() {
  const t = useTranslations();
  const platformAccess = usePlatformAccess();
  const isPrivileged = platformAccess.canAccessDevTools;

  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    setLoading(true);
    getDevPerformance()
      .then((d) => { if (!cancelled) setData(d as PerfData); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isPrivileged, reloadKey]);

  if (!isPrivileged) {
    return (
      <DevPanelLayout title={t("devPanel.performance.title")} description={t("devPanel.performance.description")}>
        <div className="card card-pad">
          <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
        </div>
      </DevPanelLayout>
    );
  }

  return (
    <DevPanelLayout
      title={t("devPanel.performance.title")}
      description={t("devPanel.performance.description")}
      headerActions={<button className="btn" type="button" onClick={() => setReloadKey((p) => p + 1)}>{t("devPanel.common.refresh")}</button>}
    >
      <DevPanelTabs />
      {error && <div className="error-alert"><div className="text-error text-sm">{error}</div></div>}

      {loading ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.performance.loading")}</div></div>
      ) : !data ? (
        <div className="card card-pad"><div className="dev-empty-state">{t("devPanel.performance.empty")}</div></div>
      ) : (
        <>
          {/* Uptime + Cache + Memory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.performance.uptime")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{formatUptime(data.uptime)}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.performance.cache.hitRate")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{data.cache.hitRate.toFixed(1)}%</div>
              <div className="text-muted text-xs mt-1">{data.cache.hits} {t("devPanel.performance.cache.hits").toLowerCase()} / {data.cache.misses} {t("devPanel.performance.cache.misses").toLowerCase()}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.performance.memory.heapUsed")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{formatBytes(data.memory.heapUsed)}</div>
              <div className="text-muted text-xs mt-1">/ {formatBytes(data.memory.heapTotal)}</div>
            </div>
            <div className="card card-pad tight">
              <div className="detail-label">{t("devPanel.performance.memory.rss")}</div>
              <div className="spacer-sm" />
              <div className="text-xl font-extrabold leading-tight">{formatBytes(data.memory.rss)}</div>
            </div>
          </div>

          {/* Slow Queries */}
          <div className="card card-pad mt-3">
            <div className="section-title">{t("devPanel.performance.slowQueries.title")}</div>
            <div className="spacer-sm" />
            {data.slowQueries.length === 0 ? (
              <div className="text-muted text-xs">No slow queries detected.</div>
            ) : (
              <div className="dev-table-wrap overflow-auto">
                <table className="table dev-table">
                  <thead>
                    <tr>
                      <th>{t("devPanel.performance.slowQueries.query")}</th>
                      <th>{t("devPanel.performance.slowQueries.count")}</th>
                      <th>{t("devPanel.performance.slowQueries.avgTime")}</th>
                      <th>{t("devPanel.performance.slowQueries.totalTime")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slowQueries.map((q) => (
                      <tr key={q.key}>
                        <td className="mono text-xs">{q.key}</td>
                        <td>{q.count}</td>
                        <td><span className="badge orange">{q.avgTime.toFixed(0)}ms</span></td>
                        <td className="text-muted">{q.totalTime.toFixed(0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Queries */}
          <div className="card card-pad mt-3">
            <div className="section-title">{t("devPanel.performance.topQueries.title")}</div>
            <div className="spacer-sm" />
            {data.topQueries.length === 0 ? (
              <div className="text-muted text-xs">No query data available.</div>
            ) : (
              <div className="dev-table-wrap overflow-auto">
                <table className="table dev-table">
                  <thead>
                    <tr>
                      <th>{t("devPanel.performance.topQueries.query")}</th>
                      <th>{t("devPanel.performance.topQueries.count")}</th>
                      <th>{t("devPanel.performance.topQueries.avgTime")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topQueries.map((q) => (
                      <tr key={q.key}>
                        <td className="mono text-xs">{q.key}</td>
                        <td className="font-bold">{q.count}</td>
                        <td className="text-muted">{q.avgTime.toFixed(0)}ms</td>
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
