"use client";

import React from "react";
import Link from "next/link";

const SITE_PANEL_TABS = [
  ["overview", "Overview"],
  ["pages", "Pages"],
  ["collections", "Content"],
  ["media", "Media"],
  ["marketing", "Marketing / SEO"],
  ["settings", "Settings"],
  ["deployments", "Deployment"],
  ["activity", "Activity"],
  ["modules", "Modules"],
  ["snapshots", "Backups"],
] as const;

type SitePanelTab = (typeof SITE_PANEL_TABS)[number][0];

interface SitePanelLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  slug?: string;
  activeTab?: SitePanelTab;
}

export function SitePanelLayout({ children, title, subtitle, actions, slug, activeTab }: SitePanelLayoutProps) {
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
                {SITE_PANEL_TABS.map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/sites/${encodeURIComponent(slug as string)}/panel/${key}`}
                    className={activeTab === key ? "btn tab-active" : "btn"}
                  >
                    {label}
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
