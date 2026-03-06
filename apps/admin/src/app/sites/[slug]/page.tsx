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
  const createdAt = (site?.site as SiteWithDates | undefined)?.createdAt;
  const updatedAt = (site?.site as SiteWithDates | undefined)?.updatedAt;
  const formattedCreatedAt = createdAt ? new Date(createdAt).toLocaleString() : "-";
  const formattedUpdatedAt = updatedAt ? new Date(updatedAt).toLocaleString() : "-";

  const details = useMemo(
    () => [
      { label: t("siteOverview.name"), value: site?.site.name ?? "-", mono: false },
      { label: t("siteOverview.slug"), value: site?.site.slug ?? "-", mono: true },
      { label: t("siteOverview.siteId"), value: site?.siteId ?? "-", mono: true },
      { label: t("siteOverview.plan"), value: planLabel || t("sitesList.basic"), mono: false },
      { label: t("siteOverview.created"), value: formattedCreatedAt, mono: false },
      { label: t("siteOverview.updated"), value: formattedUpdatedAt, mono: false },
      { label: t("siteOverview.yourRole"), value: site?.role ?? "-", mono: false },
    ],
    [t, site, planLabel, formattedCreatedAt, formattedUpdatedAt]
  );

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
          <Link href={`/sites/${encodeURIComponent(slug)}/panel/pages`} className="btn btn-primary">
            {t("siteOverview.editInBuilder") || "Edit in builder"}
          </Link>
        </div>
      </div>

      <div className="spacer" />

      <div className="grid cols-2">
        <div className="card card-pad tight">
          <div className="section-title">{t("siteOverview.details")}</div>
          <div className="spacer-sm" />
          <div className="space-y-2">
            {details.map((item) => (
              <div key={item.label} className="card tight card-pad">
                <div className="row-between">
                  <div className="detail-label">{item.label}</div>
                  <div className={item.mono ? "mono break-all font-semibold" : "font-semibold capitalize"}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad tight">
          <div className="section-title">{t("siteOverview.quickActions")}</div>
          <div className="spacer-sm" />
          <div className="grid" style={{ gap: 10 }}>
            <Link href={`/sites/${encodeURIComponent(slug)}/panel/pages`} className="btn btn-primary">
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

