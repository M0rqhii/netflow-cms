"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useTranslations } from "@/hooks/useTranslations";

export const DEV_PANEL_TABS = [
  { id: "runtime", labelKey: "devPanel.tabs.runtime", href: "/dev/runtime" },
  { id: "sites", labelKey: "devPanel.tabs.sites", href: "/dev/sites" },
  { id: "payments", labelKey: "devPanel.tabs.payments", href: "/dev/payments" },
  { id: "emails", labelKey: "devPanel.tabs.emails", href: "/dev/emails" },
  { id: "api-keys", labelKey: "devPanel.tabs.apiKeys", href: "/dev/api-keys" },
  { id: "webhooks", labelKey: "devPanel.tabs.webhooks", href: "/dev/webhooks" },
  { id: "logs", labelKey: "devPanel.tabs.logs", href: "/dev/logs" },
  { id: "flags", labelKey: "devPanel.tabs.flags", href: "/dev/flags" },
] as const;

export function DevPanelTabs({ className }: { className?: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <div className={clsx("card tab-bar dev-panel-tabs-card", className)}>
      <div className="pill-row">
        {DEV_PANEL_TABS.map((tab) => {
          const isActive = pathname === tab.href || (pathname === "/dev" && tab.id === "runtime");
          return (
            <Link key={tab.id} href={tab.href} className="pill-btn" aria-current={isActive ? "page" : undefined}>
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
