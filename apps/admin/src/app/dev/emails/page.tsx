"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevEmails } from "@/lib/api";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin"];
const PRIVILEGED_PLATFORM_ROLES = ["platform_admin"];

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
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || "";
  const userPlatformRole = (payload?.platformRole as string) || "";
  const isSuperAdmin = Boolean(payload?.isSuperAdmin) || userRole === "super_admin";
  const isPrivileged =
    isSuperAdmin || PRIVILEGED_ROLES.includes(userRole) || PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);
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
          setError(e instanceof Error ? e.message : "Failed to load email logs");
        }
      })
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged]);

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

  if (isProd && !isSuperAdmin) {
    return (
      <DevPanelLayout title="Email Logs" description="Recent dev emails (DevMailer)">
        <div className="card card-pad">
          <div className="font-black">Dev Panel disabled</div>
          <div className="text-muted text-xs mt-1.5">Only available outside production.</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title="Email Logs" description="Recent dev emails (DevMailer)">
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
    <DevPanelLayout title="Email Logs" description="Recent dev emails (DevMailer)">
      <DevPanelTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card card-pad tight">
          <div className="detail-label">Events</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{logs.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Sent / delivered</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{sentCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Failed</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{failedCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Last event</div>
          <div className="spacer-sm" />
          <div className="text-sm font-semibold">{formatDateTime(latestEventAt)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">Email activity</div>
            <div className="text-muted text-xs mt-1.5">Recent deliveries from dev mail provider.</div>
          </div>
          <div className="row-wrap">
            <span className="badge gray">recipients: {recipientCount}</span>
            <span className="badge blue">profile: {appProfile}</span>
          </div>
        </div>

        <div className="spacer-sm" />
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <LoadingSpinner text="Loading email logs..." />
          </div>
        ) : error ? (
          <div className="error-alert">
            <div className="text-error text-sm">{error}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="dev-empty-state">No email logs yet.</div>
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
                  <div className="detail-label">Subject</div>
                  <div className="text-sm">{log.subject || "-"}</div>
                  <div className="spacer-sm" />
                  <div className="detail-label">Timestamp</div>
                  <div className="text-sm">{formatDateTime(log.sentAt || log.createdAt)}</div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto dev-table-wrap">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Timestamp</th>
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
