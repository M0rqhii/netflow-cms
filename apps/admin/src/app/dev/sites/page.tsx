"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevSites } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";
import { DevPanelTabs } from "@/components/dev-panel/DevPanelTabs";

const PRIVILEGED_ROLES = ["super_admin", "org_admin", "site_admin"];
const PRIVILEGED_PLATFORM_ROLES = ["platform_admin"];

type DevSiteRow = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  createdAt?: string;
};

type SiteWithCreatedAt = SiteInfo["site"] & { createdAt?: string };

const isSiteInfo = (value: unknown): value is SiteInfo => {
  return Boolean(value && typeof value === "object" && "site" in value && "siteId" in value);
};

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getPlanBadgeClass(plan?: string): string {
  const normalizedPlan = String(plan || "free").toLowerCase();
  if (normalizedPlan === "enterprise") return "badge blue";
  if (normalizedPlan === "free" || normalizedPlan === "basic") return "badge gray";
  return "badge green";
}

export default function DevSitesPage() {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";
  const isProd = appProfile === "production";
  const token = getAuthToken();
  const payload = useMemo(() => decodeAuthToken(token), [token]);
  const userRole = (payload?.role as string) || "";
  const userPlatformRole = (payload?.platformRole as string) || "";
  const isSuperAdmin = Boolean(payload?.isSuperAdmin) || userRole === "super_admin";
  const isPrivileged =
    isSuperAdmin || PRIVILEGED_ROLES.includes(userRole) || PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole);

  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProd || !isPrivileged) return;
    setLoading(true);
    setError(null);
    getDevSites()
      .then((data) => {
        const normalized: SiteInfo[] = (Array.isArray(data) ? data : []).map((item) => {
          if (isSiteInfo(item)) return item;
          const fallback = item as DevSiteRow;
          return {
            siteId: fallback.id,
            role: "admin",
            site: {
              id: fallback.id,
              name: fallback.name,
              slug: fallback.slug,
              plan: fallback.plan ?? "free",
              createdAt: fallback.createdAt,
            },
          };
        });
        setSites(normalized);
      })
      .catch((e) => {
        const isForbidden =
          e instanceof Error &&
          (e.message.includes("403") ||
            e.message.includes("Forbidden") ||
            e.message.includes("Insufficient permissions"));
        if (!isForbidden) {
          setError(e instanceof Error ? e.message : "Failed to load sites");
        }
      })
      .finally(() => setLoading(false));
  }, [isProd, isPrivileged]);

  const paidSites = useMemo(
    () => sites.filter((site) => String(site.site.plan || "free").toLowerCase() !== "free").length,
    [sites],
  );

  const recentSites = useMemo(() => {
    const monthAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
    return sites.filter((site) => {
      const createdAt = (site.site as SiteWithCreatedAt).createdAt;
      if (!createdAt) return false;
      const dateValue = new Date(createdAt).getTime();
      return Number.isFinite(dateValue) && dateValue >= monthAgo;
    }).length;
  }, [sites]);

  const latestCreatedAt = useMemo(() => {
    const sortedDates = sites
      .map((site) => (site.site as SiteWithCreatedAt).createdAt)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedDates[0];
  }, [sites]);

  if (isProd && !isSuperAdmin) {
    return (
      <DevPanelLayout title="Sites" description="List of all sites (non-prod)">
        <div className="card card-pad">
          <div className="font-black">Dev Panel disabled</div>
          <div className="text-muted text-xs mt-1.5">Only available outside production.</div>
        </div>
      </DevPanelLayout>
    );
  }

  if (!isPrivileged) {
    return (
      <DevPanelLayout title="Sites" description="List of all sites (non-prod)">
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
    <DevPanelLayout title="Sites" description="Non-production site registry">
      <DevPanelTabs />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card card-pad tight">
          <div className="detail-label">Total sites</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{sites.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Paid plans</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{paidSites}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Created (30d)</div>
          <div className="spacer-sm" />
          <div className="text-xl font-extrabold leading-tight">{recentSites}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">Latest create</div>
          <div className="spacer-sm" />
          <div className="text-sm font-semibold">{formatDateTime(latestCreatedAt)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row-between row-wrap">
          <div>
            <div className="section-title">Sites</div>
            <div className="text-muted text-xs mt-1.5">Cross-organization site list from dev endpoint.</div>
          </div>
          <div className="row-wrap">
            <span className="badge gray">rows: {sites.length}</span>
            <span className="badge blue">profile: {appProfile}</span>
          </div>
        </div>

        <div className="spacer-sm" />
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <LoadingSpinner text="Loading sites..." />
          </div>
        ) : error ? (
          <div className="error-alert">
            <div className="text-error text-sm">{error}</div>
          </div>
        ) : sites.length === 0 ? (
          <div className="dev-empty-state">No sites found.</div>
        ) : (
          <div>
            <div className="grid gap-2 md:hidden">
              {sites.map((site) => {
                const createdAt = (site.site as SiteWithCreatedAt).createdAt;
                return (
                  <div key={site.siteId} className="card card-pad tight">
                    <div className="row-between">
                      <div className="font-semibold">{site.site.name}</div>
                      <span className={getPlanBadgeClass(site.site.plan)}>{site.site.plan || "free"}</span>
                    </div>
                    <div className="spacer-sm" />
                    <div className="detail-label">Slug</div>
                    <div className="mono text-xs">{site.site.slug}</div>
                    <div className="spacer-sm" />
                    <div className="detail-label">ID</div>
                    <div className="mono text-xs">{site.siteId}</div>
                    <div className="spacer-sm" />
                    <div className="detail-label">Created</div>
                    <div className="text-sm">{formatDateTime(createdAt)}</div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto dev-table-wrap">
              <table className="table dev-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Plan</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.siteId}>
                      <td className="mono text-xs">{site.siteId}</td>
                      <td className="font-semibold">{site.site.name}</td>
                      <td className="mono text-xs">{site.site.slug}</td>
                      <td>
                        <span className={getPlanBadgeClass(site.site.plan)}>{site.site.plan || "free"}</span>
                      </td>
                      <td className="text-muted">
                        {formatDateTime((site.site as SiteWithCreatedAt).createdAt)}
                      </td>
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
