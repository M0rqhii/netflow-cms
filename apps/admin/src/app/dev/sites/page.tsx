"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeAuthToken, getAuthToken, getDevSites } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { LoadingSpinner } from "@repo/ui";
import { DevPanelLayout } from "@/components/dev-panel/DevPanelLayout";

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
    <DevPanelLayout title="Sites" description="List of all sites (non-prod)">
      <div className="animate-fade-in">
        <div className="card card-pad">
        <div className="section-title">Sites</div>
        <div className="spacer-sm" />
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <LoadingSpinner text="Loading sites..." />
          </div>
        ) : error ? (
          <div className="text-error text-xs">{error}</div>
        ) : sites.length === 0 ? (
          <div className="text-muted">No sites found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
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
                    <td>{site.site.name}</td>
                    <td className="mono text-xs">{site.site.slug}</td>
                    <td>{site.site.plan || "free"}</td>
                    <td>
                      {(() => {
                        const createdAt = (site.site as SiteWithCreatedAt).createdAt;
                        return createdAt ? new Date(createdAt).toLocaleString() : "-";
                      })()}
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

