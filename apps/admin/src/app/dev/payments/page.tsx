"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevPayments } from "@/lib/api";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin"];
const PRIVILEGED_PLATFORM_ROLES = ["platform_admin"];

export default function DevPaymentsPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || "";
  const userPlatformRole = (payload?.platformRole as string) || "";
  const isSuperAdmin = Boolean(payload?.isSuperAdmin) || userRole === "super_admin";
  const isPrivileged =
    isSuperAdmin || PRIVILEGED_ROLES.includes(userRole) || PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);
  const [payments, setPayments] = useState<
    Array<{ id: string; orgId: string; plan?: string; status: string; currentPeriodStart?: string; currentPeriodEnd?: string; createdAt?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevPayments()
      .then((data) => setPayments(data))
      .catch((e) => {
        const isForbidden =
          e instanceof Error &&
          (e.message.includes("403") ||
            e.message.includes("Forbidden") ||
            e.message.includes("Insufficient permissions"));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : "Failed to load payment events");
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
    <DevPanelLayout title="Payments" description="Simulated subscriptions and payment events (DevPaymentProvider)">
      <div className="animate-fade-in">
        <div className="card card-pad">
        <div className="section-title">Payment events</div>
        <div className="spacer-sm" />
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <LoadingSpinner text="Loading payment events..." />
          </div>
        ) : error ? (
          <div className="text-error text-xs">{error}</div>
        ) : payments.length === 0 ? (
          <div className="text-muted">No payment events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Site ID</th>
                  <th>Status</th>
                  <th>Period end</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((evt) => (
                  <tr key={evt.id}>
                    <td className="mono text-xs">{evt.plan}</td>
                    <td className="mono text-xs">{evt.orgId}</td>
                    <td>
                      <span className={evt.status === "active" ? "badge green" : "badge orange"}>{evt.status}</span>
                    </td>
                    <td className="text-muted">
                      {evt.currentPeriodEnd ? new Date(evt.currentPeriodEnd).toLocaleDateString() : "-"}
                    </td>
                    <td className="text-muted">
                      {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : "-"}
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

