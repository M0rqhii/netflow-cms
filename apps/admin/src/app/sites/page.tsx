"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import { fetchMySites } from "@/lib/api";
import { statusToBadge, fmtBytes } from "@/lib/formatters";
import { publishGlobalSearch, readGlobalSearch, subscribeGlobalSearch } from "@/lib/shell";
import type { SiteInfo } from "@repo/sdk";

type EditorChip = {
  id: string;
  name: string;
  initials: string;
  toneClass: string;
  avatarUrl: string;
};

const EDITOR_POOL: EditorChip[] = [
  {
    id: "anna-kowalska",
    name: "Anna Kowalska",
    initials: "AK",
    toneClass: "editor-tone-1",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=AnnaKowalska",
  },
  {
    id: "piotr-nowak",
    name: "Piotr Nowak",
    initials: "PN",
    toneClass: "editor-tone-2",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=PiotrNowak",
  },
  {
    id: "marta-zielinska",
    name: "Marta Zielinska",
    initials: "MZ",
    toneClass: "editor-tone-3",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=MartaZielinska",
  },
  {
    id: "tomasz-wisniewski",
    name: "Tomasz Wisniewski",
    initials: "TW",
    toneClass: "editor-tone-4",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=TomaszWisniewski",
  },
  {
    id: "karolina-lewandowska",
    name: "Karolina Lewandowska",
    initials: "KL",
    toneClass: "editor-tone-5",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=KarolinaLewandowska",
  },
  {
    id: "jakub-dabrowski",
    name: "Jakub Dabrowski",
    initials: "JD",
    toneClass: "editor-tone-6",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=JakubDabrowski",
  },
];

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

function getSnapshotAgeLabel(index: number): string {
  const minutes = Math.max(0, index * 7);
  if (minutes < 1) return "0s temu";
  if (minutes < 60) return `${minutes}m temu`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h temu`;
}

function getSiteEditors(index: number): EditorChip[] {
  const count = 3 + (index % 2);
  const start = (index * 2) % EDITOR_POOL.length;
  return Array.from({ length: count }, (_, i) => EDITOR_POOL[(start + i) % EDITOR_POOL.length]);
}

function normalizePreviewDomain(slug: string): string {
  const cleaned = (slug || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!cleaned) return "example.com";
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
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
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
          filteredSites.map((s, idx) => {
            const [txt, cls] = statusToBadge(s.site?.plan);
            const safeName = s.site?.name || "";
            const safeDomain = s.site?.slug || "";
            const normalizedDomain = normalizePreviewDomain(safeDomain);

            const ip = `10.0.0.${(idx % 200) + 20}`;
            const storage = fmtBytes((idx + 2) * 18 * 1024 * 1024);
            const bandwidth = fmtBytes((idx + 2) * 42 * 1024 * 1024);
            const editors = getSiteEditors(idx);
            const visibleEditors = editors.slice(0, 3);
            const hiddenEditorsCount = Math.max(0, editors.length - visibleEditors.length);
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
                    <div>Snapshot: <span className="snapshot-age">{getSnapshotAgeLabel(idx)}</span></div>
                    <div className="editor-stack" aria-label="Aktywni edytorzy">
                      {visibleEditors.map((editor) => {
                        const avatarKey = `${s.siteId}:${editor.id}`;
                        const avatarFailed = Boolean(failedAvatars[avatarKey]);
                        return (
                          <span
                            key={avatarKey}
                            className={`editor-avatar ${editor.toneClass}${avatarFailed ? " avatar-failed" : ""}`}
                            title={editor.name}
                          >
                            {!avatarFailed ? (
                              <Image
                                className="editor-avatar-img"
                                src={editor.avatarUrl}
                                alt={editor.name}
                                width={26}
                                height={26}
                                unoptimized
                                onError={() => {
                                  setFailedAvatars((prev) => ({ ...prev, [avatarKey]: true }));
                                }}
                              />
                            ) : null}
                            <span className="editor-avatar-fallback">{editor.initials}</span>
                          </span>
                        );
                      })}
                      {hiddenEditorsCount > 0 ? (
                        <span className="editor-more">+{hiddenEditorsCount}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="divider-subtle" />

                  <div className="row-wrap site-metric-row">
                    <span className="badge gray">IP: {ip}</span>
                    <span className="badge gray">Storage: {storage}</span>
                    <span className="badge gray">Bandwidth: {bandwidth}</span>
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




