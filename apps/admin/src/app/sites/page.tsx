"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import { fetchMySites } from "@/lib/api";
import { statusToBadge } from "@/lib/formatters";
import { publishGlobalSearch, readGlobalSearch, subscribeGlobalSearch } from "@/lib/shell";
import type { SiteInfo } from "@repo/sdk";

let sitesCache: SiteInfo[] | null = null;
let sitesPromise: Promise<SiteInfo[]> | null = null;

function clearSitesCache() {
  sitesCache = null;
  sitesPromise = null;
}

async function loadSites(): Promise<SiteInfo[]> {
  if (sitesCache) {
    const validCached = sitesCache.filter((s) => s?.site != null);
    if (validCached.length !== sitesCache.length) {
      sitesCache = validCached;
    }
    return sitesCache;
  }

  if (!sitesPromise) {
    sitesPromise = fetchMySites()
      .then((data) => {
        const validSites = data.filter((s) => s?.site != null);
        sitesCache = validSites;
        return validSites;
      })
      .catch((error) => {
        sitesPromise = null;
        throw error;
      });
  }

  return sitesPromise;
}

function formatSiteCreatedAt(site: SiteInfo): string {
  const raw = (site.site as { createdAt?: string } | undefined)?.createdAt;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function normalizePreviewDomain(slug: string): string {
  const cleaned = (slug || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!cleaned) return "site.net-flow.cloud";
  if (cleaned.includes(".")) return cleaned;
  return `${cleaned}.net-flow.cloud`;
}

function getSnapshotSources(slug: string): { primary: string; secondary: string } {
  const domain = normalizePreviewDomain(slug);
  const target = `https://${domain}`;
  const dayBucket = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

  return {
    primary: `https://s.wordpress.com/mshots/v1/${encodeURIComponent(target)}?w=1200&h=760&cb=${dayBucket}`,
    secondary: `https://image.thum.io/get/width/1200/noanimate/${encodeURIComponent(target)}`,
  };
}

export default function SitesPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotStageBySite, setSnapshotStageBySite] = useState<Record<string, "primary" | "secondary" | "failed">>({});
  const { push } = useToast();

  const rawSearchQuery = (searchParams.get("q") || "").trim();
  const searchQuery = rawSearchQuery.toLowerCase();

  useEffect(() => {
    let isMounted = true;
    clearSitesCache();

    loadSites()
      .then((data) => {
        if (!isMounted) return;
        const validSites = data.filter((s) => s?.site != null);
        setSites(validSites);
      })
      .catch((error) => {
        if (!isMounted) return;
        push({
          tone: "error",
          message: error instanceof Error ? error.message : t("sitesList.failedToLoadSites"),
        });
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [push, t]);

  useEffect(() => {
    if (rawSearchQuery) return;

    const nextSearch = readGlobalSearch();
    if (!nextSearch) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", nextSearch);
    const queryString = params.toString();
    router.replace(queryString ? `/sites?${queryString}` : "/sites");
  }, [router, searchParams, rawSearchQuery]);

  useEffect(() => {
    publishGlobalSearch(rawSearchQuery);
  }, [rawSearchQuery]);

  useEffect(() => {
    return subscribeGlobalSearch((nextSearch) => {
      const current = (searchParams.get("q") || "").trim();
      if (current === nextSearch) return;

      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) {
        params.set("q", nextSearch);
      } else {
        params.delete("q");
      }

      const queryString = params.toString();
      router.replace(queryString ? `/sites?${queryString}` : "/sites");
    });
  }, [router, searchParams]);

  const filteredSites = useMemo(() => {
    return sites
      .filter((site) => {
        if (!site || !site.site || typeof site.site !== "object") return false;
        const siteData = site.site;
        const matchesSearch =
          !searchQuery ||
          siteData.name?.toLowerCase().includes(searchQuery) ||
          siteData.slug?.toLowerCase().includes(searchQuery);
        return matchesSearch;
      })
      .sort((a, b) => (a?.site?.name || "").localeCompare(b?.site?.name || ""));
  }, [searchQuery, sites]);

  return (
    <div className="sites-page-fluid w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <div className="card sites-header-card p-4 sm:p-6 mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="view-title">Sites</div>
            <div className="view-sub">Lista projektow w organizacji. Wyszukiwarka filtruje po nazwie/domenie/statusie.</div>
          </div>
          <div className="flex items-center">
            <Link className="btn btn-primary sites-create-btn" href="/sites/new">Utworz projekt</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="card p-4 text-muted">Ladowanie...</div>
        ) : filteredSites.length === 0 ? (
          <div className="card p-4 text-muted">Brak wynikow.</div>
        ) : (
          filteredSites.map((s) => {
            const [txt, cls] = statusToBadge(s.site?.plan);
            const safeName = s.site?.name || "";
            const safeDomain = s.site?.slug || "";
            const normalizedDomain = normalizePreviewDomain(safeDomain);
            const snapshotSources = getSnapshotSources(safeDomain);
            const snapshotStage = snapshotStageBySite[s.siteId] || "primary";
            const snapshotSrc = snapshotStage === "secondary" ? snapshotSources.secondary : snapshotSources.primary;

            return (
              <div key={s.siteId} className="card site-card-modern">
                <div className="site-snapshot-wrap">
                  {snapshotStage !== "failed" ? (
                    <Image
                      key={`${s.siteId}-${snapshotStage}`}
                      className="site-snapshot-img"
                      src={snapshotSrc}
                      alt={`Snapshot ${safeName}`}
                      fill
                      unoptimized
                      loading="lazy"
                      sizes="(max-width: 1280px) 100vw, 50vw"
                      onError={() => {
                        setSnapshotStageBySite((prev) => {
                          const current = prev[s.siteId] || "primary";
                          if (current === "primary") return { ...prev, [s.siteId]: "secondary" };
                          if (current === "secondary") return { ...prev, [s.siteId]: "failed" };
                          return prev;
                        });
                      }}
                    />
                  ) : (
                    <div className="site-snapshot-fallback">
                      <div className="site-snapshot-fallback-mark">{safeName.slice(0, 1).toUpperCase() || "N"}</div>
                      <div className="site-snapshot-fallback-copy">Snapshot unavailable</div>
                    </div>
                  )}
                  <div className="site-snapshot-overlay" />

                  <div className="site-snapshot-head">
                    <span className={cls}>{txt}</span>
                  </div>

                  <div className="site-snapshot-foot">
                    <div className="site-card-name truncate">{safeName}</div>
                    <div className="site-card-domain truncate">{normalizedDomain}</div>
                  </div>
                </div>

                <div className="site-card-modern-body">
                  <div className="flex items-center justify-between gap-3 text-muted text-xs">
                    <div>Created: <span className="snapshot-age">{formatSiteCreatedAt(s)}</span></div>
                    <div>Role: <span className="snapshot-age">{s.role || "-"}</span></div>
                  </div>

                  <div className="divider-subtle" />

                  <div className="row-wrap site-metric-row">
                    <span className="badge gray">Site ID: {s.siteId}</span>
                    <span className="badge gray">Slug: {s.site?.slug || "-"}</span>
                    <span className="badge gray">Plan: {txt}</span>
                  </div>

                  <Link className="btn btn-full site-open-btn" href={`/sites/${encodeURIComponent(s.site?.slug || s.siteId)}/panel`}>
                    Otworz panel
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
