"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";

const SITE_PANEL_TABS = [
  { key: "overview", labelKey: "sitePanelNav.overview" },
  { key: "pages", labelKey: "sitePanelNav.pages" },
  { key: "collections", labelKey: "sitePanelNav.content" },
  { key: "media", labelKey: "sitePanelNav.media" },
  { key: "marketing", labelKey: "sitePanelNav.marketing" },
  { key: "settings", labelKey: "sitePanelNav.settings" },
  { key: "deployments", labelKey: "sitePanelNav.deployments" },
  { key: "activity", labelKey: "sitePanelNav.activity" },
  { key: "users", labelKey: "sitePanelNav.users" },
  { key: "modules", labelKey: "sitePanelNav.modules" },
  { key: "snapshots", labelKey: "sitePanelNav.snapshots" },
] as const;

type SitePanelTab = (typeof SITE_PANEL_TABS)[number]["key"];

interface SitePanelLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  slug?: string;
  activeTab?: SitePanelTab;
}

export function SitePanelLayout({ children, title, subtitle, actions, slug, activeTab }: SitePanelLayoutProps) {
  const t = useTranslations();
  const showHeader = Boolean(title || subtitle || actions);
  const showTabs = Boolean(slug && activeTab);

  return (
    <div className="site-panel-fluid w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <div className="site-panel-shell">
        {showHeader && (
          <>
            <div className="card card-pad site-panel-header">
              <div className="row-start">
                <div>
                  {title ? <div className="view-title">{title}</div> : null}
                  {subtitle ? <div className="view-sub">{subtitle}</div> : null}
                </div>
                {actions ? <div className="row-wrap">{actions}</div> : null}
              </div>
            </div>
            <div className="spacer" />
          </>
        )}

        {showTabs && (
          <>
            <div className="card tab-bar">
              <div className="tab-row">
                {SITE_PANEL_TABS.map((tab) => (
                  <Link
                    key={tab.key}
                    href={`/sites/${encodeURIComponent(slug as string)}/panel/${tab.key}`}
                    className={activeTab === tab.key ? "btn tab-active" : "btn"}
                  >
                    {t(tab.labelKey)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="spacer" />
          </>
        )}

        {children}
      </div>
    </div>
  );
}
