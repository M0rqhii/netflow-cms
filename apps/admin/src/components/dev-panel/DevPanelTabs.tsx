"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export const DEV_PANEL_TABS = [
  { id: "runtime", label: "Runtime", href: "/dev/runtime" },
  { id: "sites", label: "Sites", href: "/dev/sites" },
  { id: "payments", label: "Payments", href: "/dev/payments" },
  { id: "emails", label: "Email Logs", href: "/dev/emails" },
  { id: "api-keys", label: "API Keys", href: "/dev/api-keys" },
  { id: "webhooks", label: "Webhooks", href: "/dev/webhooks" },
  { id: "logs", label: "Logs", href: "/dev/logs" },
  { id: "flags", label: "Feature Flags", href: "/dev/flags" },
] as const;

export function DevPanelTabs({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={clsx("card tab-bar dev-panel-tabs-card", className)}>
      <div className="pill-row">
        {DEV_PANEL_TABS.map((tab) => {
          const isActive = pathname === tab.href || (pathname === "/dev" && tab.id === "runtime");
          return (
            <Link key={tab.id} href={tab.href} className="pill-btn" aria-current={isActive ? "page" : undefined}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
