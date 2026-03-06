"use client";

import React from "react";
import { useTranslations } from "@/hooks/useTranslations";

interface DevPanelLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
}

export function DevPanelLayout({ children, title, description, headerActions }: DevPanelLayoutProps) {
  const t = useTranslations();
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || "development";

  return (
    <div className="dev-panel-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <section className="dev-panel-shell">
        <div className="card card-pad dev-panel-hero">
          <div className="row-start" style={{ flexWrap: "wrap" }}>
            <div>
              <div className="view-title">{title || t("devPanel.layout.defaultTitle")}</div>
              <div className="view-sub">{description || t("devPanel.layout.defaultDescription")}</div>
            </div>
            <div className="row-wrap">
              {headerActions}
              <span className="badge orange">{t("devPanel.layout.nonProductionOnly")}</span>
              <span className="badge gray">{appProfile}</span>
            </div>
          </div>
        </div>

        <div className="dev-panel-content">{children}</div>
      </section>
    </div>
  );
}
