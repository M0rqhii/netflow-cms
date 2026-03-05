"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EmptyState, Skeleton } from "@repo/ui";
import { useTranslations } from "@/hooks/useTranslations";
import { fetchMySites } from "@/lib/api";
import { trackOnboardingSuccess } from "@/lib/onboarding";
import type { SiteInfo } from "@repo/sdk";

type SiteWithDates = SiteInfo["site"] & { createdAt?: string; updatedAt?: string };

export default function SiteOverviewPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [site, setSite] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sites = await fetchMySites();
        const current = sites.find((item) => item?.site?.slug === slug) || null;

        if (!current) {
          setNotFound(true);
          return;
        }

        setSite(current);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    if (site) {
      trackOnboardingSuccess("project_opened");
    }
  }, [site]);

  const planLabel = useMemo(() => site?.site.plan || "org", [site?.site.plan]);

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="space-y-4">
          <Skeleton variant="text" width={200} height={32} />
          <div className="grid" style={{ gap: 12 }}>
            <div className="card card-pad">
              <Skeleton variant="text" width={150} height={24} className="mb-4" />
              <Skeleton variant="text" width={100} height={16} />
              <Skeleton variant="text" width={120} height={16} className="mt-2" />
            </div>
            <div className="card card-pad">
              <Skeleton variant="text" width={150} height={24} className="mb-4" />
              <Skeleton variant="text" width={100} height={16} />
              <Skeleton variant="text" width={120} height={16} className="mt-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="card card-pad">
        <div className="mb-3">
          <Link href="/sites" className="btn">
            {t("siteOverview.backToSites")}
          </Link>
        </div>
        <EmptyState title={t("siteOverview.siteNotFound")} description={t("siteOverview.siteNotFoundDescription")} />
      </div>
    );
  }

  return (
    <div>
      <div className="card card-pad">
        <div className="row-start">
          <div>
            <div className="view-title">{site.site.name}</div>
            <div className="view-sub">{t("siteOverview.siteOverviewAndQuickActions")}</div>
          </div>
          <div className="row-wrap">
            <span className="badge gray">{site.role}</span>
            <span className="badge gray">Plan: {planLabel}</span>
          </div>
        </div>
        <div className="spacer-sm" />
        <div className="row-wrap" style={{ justifyContent: "flex-start" }}>
          <Link href="/sites" className="btn">
            {t("siteOverview.backToSites")}
          </Link>
          <Link href={`/sites/${encodeURIComponent(slug)}/panel`} className="btn">
            {t("siteOverview.openSitePanel")}
          </Link>
          <Link href={`/sites/${encodeURIComponent(slug)}/panel/pages`} className="btn primary">
            {t("siteOverview.editInBuilder") || "Edit in builder"}
          </Link>
        </div>
      </div>

      <div className="spacer" />

      <div className="grid cols-2">
        <div className="card card-pad tight">
          <div className="section-title">{t("siteOverview.details")}</div>
          <div className="spacer-sm" />
          <dl className="detail-list">
            <div>
              <dt className="detail-label">{t("siteOverview.name")}</dt>
              <dd className="font-bold">{site.site.name}</dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.slug")}</dt>
              <dd className="mono">{site.site.slug}</dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.siteId")}</dt>
              <dd className="mono break-all">{site.siteId}</dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.plan")}</dt>
              <dd>{planLabel || t("sitesList.basic")}</dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.created")}</dt>
              <dd>
                {(() => {
                  const createdAt = (site.site as SiteWithDates).createdAt;
                  return createdAt ? new Date(createdAt).toLocaleString() : "N/A";
                })()}
              </dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.updated")}</dt>
              <dd>
                {(() => {
                  const updatedAt = (site.site as SiteWithDates).updatedAt;
                  return updatedAt ? new Date(updatedAt).toLocaleString() : "N/A";
                })()}
              </dd>
            </div>
            <div>
              <dt className="detail-label">{t("siteOverview.yourRole")}</dt>
              <dd className="capitalize">{site.role}</dd>
            </div>
          </dl>
        </div>

        <div className="card card-pad tight">
          <div className="section-title">{t("siteOverview.quickActions")}</div>
          <div className="spacer-sm" />
          <div className="grid" style={{ gap: 10 }}>
            <Link href={`/sites/${encodeURIComponent(slug)}/panel/pages`} className="btn primary">
              {t("siteOverview.editInBuilder") || "Edit in builder"}
            </Link>
            <Link href={`/sites/${encodeURIComponent(slug)}/panel`} className="btn">
              {t("siteOverview.openSitePanel")}
            </Link>
            <Link href={`/sites/${encodeURIComponent(slug)}/panel/marketing`} className="btn">
              {t("siteOverview.marketing") || "Marketing"}
            </Link>
            <Link href={`/sites/${encodeURIComponent(slug)}/users`} className="btn">
              {t("siteOverview.manageUsers")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
