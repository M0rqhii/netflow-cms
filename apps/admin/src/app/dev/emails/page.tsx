"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevEmails } from "@/lib/api";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin"];
const PRIVILEGED_PLATFORM_ROLES = ["platform_admin"];

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
  const [logs, setLogs] = useState<
    Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; createdAt?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevEmails()
      .then((data) => setLogs(data))
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

  if (isProd && !isSuperAdmin) {
    return (
      <div className="card card-pad">
        <div className="font-black">Dev Panel disabled</div>
        <div className="text-muted text-xs mt-1.5">Only available outside production.</div>
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="card card-pad">
        <div className="font-black">Access denied</div>
        <div className="text-muted text-xs mt-1.5">Only privileged users can access the Dev Panel.</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={() => (window.location.href = "/dashboard")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <DevPanelLayout title="Email Logs" description="Recent dev emails (DevMailer)">
      <div className="animate-fade-in">
        <div className="card card-pad">
        <div className="section-title">Email log</div>
        <div className="spacer-sm" />
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <LoadingSpinner text="Loading email logs..." />
          </div>
        ) : error ? (
          <div className="text-error text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-muted">No email logs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
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
                    <td>{log.to}</td>
                    <td>{log.subject}</td>
                    <td>
                      <span className={log.status === "sent" ? "badge green" : "badge orange"}>{log.status}</span>
                    </td>
                    <td className="text-muted">
                      {new Date(log.sentAt || log.createdAt || "").toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </DevPanelLayout>
  );
}

