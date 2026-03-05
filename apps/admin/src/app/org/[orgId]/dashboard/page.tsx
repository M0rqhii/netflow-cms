"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@repo/ui";
import { fetchOrgDashboard, type DashboardResponse } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { timeAgo } from "@/lib/formatters";

export default function OrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboardData = await fetchOrgDashboard(orgId);
        setData(dashboardData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
        push({ tone: "error", message });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgId, push]);

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card card-pad">
        <div style={{ color: "#ef4444", fontWeight: 700 }}>Failed to load dashboard</div>
        <div className="detail-label" style={{ marginTop: 6 }}>{error || "Unknown error"}</div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: "LIVE" | "DRAFT" | "ERROR") => {
    if (status === "LIVE") return "badge green";
    if (status === "ERROR") return "badge orange";
    return "badge gray";
  };

  const getSeverityBadgeClass = (severity: "high" | "medium" | "low") => {
    if (severity === "high") return "badge orange";
    if (severity === "medium") return "badge orange";
    return "badge gray";
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: `Org ${orgId}` }]} />

      <div className="card card-pad">
        <div className="view-title">Organization Dashboard</div>
        <div className="view-sub">What do you have under control today?</div>
      </div>

      <div className="spacer" />

      {data.alerts && data.alerts.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div className="section-title">Alerts</div>
          <div className="spacer-sm" />
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                <div className="row-between">
                  <div className="row">
                    <span className={getSeverityBadgeClass(alert.severity)}>{alert.severity.toUpperCase()}</span>
                    <span style={{ fontWeight: 700 }}>{alert.message}</span>
                  </div>
                  <button className="btn" onClick={() => router.push(alert.actionUrl)}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.business && (
        <div className="grid cols-3">
          <div className="card card-pad" style={{ borderRadius: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Plan</div>
            <div className="spacer-sm" />
            <div style={{ fontWeight: 900, fontSize: 18 }}>{data.business.plan.name}</div>
            <div className="detail-label" style={{ marginTop: 6 }}>
              Pages: {data.business.plan.limits.maxPages === -1 ? "Unlimited" : data.business.plan.limits.maxPages}
              <br />
              Users: {data.business.plan.limits.maxUsers === -1 ? "Unlimited" : data.business.plan.limits.maxUsers}
              <br />
              Storage: {data.business.plan.limits.maxStorageMB === -1 ? "Unlimited" : `${data.business.plan.limits.maxStorageMB}MB`}
            </div>
            <div className="spacer-sm" />
            <button className="btn" onClick={() => router.push(`/org/${orgId}/billing`)}>Upgrade</button>
          </div>

          <div className="card card-pad" style={{ borderRadius: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Usage</div>
            <div className="spacer-sm" />
            <div className="detail-label">Storage</div>
            <div style={{ height: 6, background: "rgba(148,163,184,0.2)", borderRadius: 999 }}>
              <div style={{ height: 6, width: `${Math.min(data.business.usage.storage.percent, 100)}%`, background: "#00a3ff", borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              {data.business.usage.storage.used}MB / {data.business.usage.storage.limit === -1 ? "-" : `${data.business.usage.storage.limit}MB`}
            </div>
            <div className="spacer-sm" />
            <div className="detail-label">API Requests</div>
            <div style={{ height: 6, background: "rgba(148,163,184,0.2)", borderRadius: 999 }}>
              <div style={{ height: 6, width: `${Math.min(data.business.usage.apiRequests.percent, 100)}%`, background: "#00a3ff", borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              {data.business.usage.apiRequests.used} / {data.business.usage.apiRequests.limit === -1 ? "-" : data.business.usage.apiRequests.limit}
            </div>
            <div className="spacer-sm" />
            <button className="btn" onClick={() => router.push(`/org/${orgId}/usage`)}>Details</button>
          </div>

          <div className="card card-pad" style={{ borderRadius: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Billing</div>
            <div className="spacer-sm" />
            <div className="detail-label">Status</div>
            <div style={{ fontWeight: 700 }}>{data.business.billing.status}</div>
            {data.business.billing.nextPayment && (
              <div style={{ marginTop: 8 }}>
                <div className="detail-label">Next payment</div>
                <div style={{ fontWeight: 700 }}>{new Date(data.business.billing.nextPayment).toLocaleDateString()}</div>
              </div>
            )}
            <div className="spacer-sm" />
            <button className="btn" onClick={() => router.push(`/org/${orgId}/billing`)}>Manage</button>
          </div>
        </div>
      )}

      {!data.business && data.usage && (
        <div className="grid cols-3">
          {([
            { label: "Storage", metric: data.usage.storage },
            { label: "API Requests", metric: data.usage.apiRequests },
            { label: "Bandwidth", metric: data.usage.bandwidth },
          ] as const).map((item) => (
            <div key={item.label} className="card card-pad" style={{ borderRadius: 18 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>{item.label}</div>
              <div className="spacer-sm" />
              <div style={{ fontWeight: 900, fontSize: 18 }}>{item.metric.percent}%</div>
              <div className="detail-label" style={{ marginTop: 6 }}>
                {item.metric.used} / {item.metric.limit === -1 ? "-" : item.metric.limit}
              </div>
              <div className="spacer-sm" />
              <button className="btn" onClick={() => router.push(`/org/${orgId}/usage`)}>Details</button>
            </div>
          ))}
        </div>
      )}

      <div className="spacer" />

      <div className="card card-pad">
        <div className="row-between" style={{ flexWrap: "wrap" }}>
          <div className="section-title">Sites</div>
          <button className="btn btn-primary" onClick={() => router.push("/sites/new")}>+ New Site</button>
        </div>
        <div className="spacer-sm" />
        {data.sites.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No sites yet.</div>
        ) : (
          <div className="space-y-3">
            {data.sites.map((site) => (
              <div key={site.id} className="card" style={{ padding: 14, borderRadius: 18 }}>
                <div className="row-start" style={{ flexWrap: "wrap" }}>
                  <div>
                    <div className="row-wrap" style={{ justifyContent: "flex-start" }}>
                      <Link href={`/sites/${site.slug}`} className="btn">
                        {site.name}
                      </Link>
                      <span className={getStatusBadgeClass(site.status)}>{site.status}</span>
                      {site.plan && <span className="badge gray">{site.plan}</span>}
                    </div>
                    <div className="detail-label" style={{ marginTop: 6 }}>
                      {site.domain ? `Domain: ${site.domain}` : "No domain"}
                    </div>
                    {site.lastDeploy && (
                      <div className="detail-label" style={{ marginTop: 6 }}>
                        Last deploy: {timeAgo(site.lastDeploy.time)} - {site.lastDeploy.status}
                      </div>
                    )}
                    {site.alerts && site.alerts.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {site.alerts.map((alert) => (
                          <div key={alert.id} style={{ color: "#fb923c", fontSize: 12 }}>{alert.message}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {site.quickActions.length > 0 && (
                    <div className="row-wrap">
                      {site.quickActions.map((action, idx) => (
                        <button key={idx} className="btn" onClick={() => router.push(action.url)}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.quickAccess && data.quickAccess.length > 0 && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="section-title">Quick Access</div>
            <div className="spacer-sm" />
            <div className="grid cols-3">
              {data.quickAccess.map((item, idx) => (
                <button key={idx} className="btn" onClick={() => router.push(item.url)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {data.activity && data.activity.length > 0 && (
        <>
          <div className="spacer" />
          <div className="card card-pad">
            <div className="section-title">Recent Activity</div>
            <div className="spacer-sm" />
            <div className="space-y-2">
              {data.activity.map((item) => (
                <div key={item.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{item.message}</div>
                  <div className="detail-label">{timeAgo(item.time)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

