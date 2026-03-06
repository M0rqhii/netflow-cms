"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import clsx from "clsx";
import { useTranslations } from "@/hooks/useTranslations";

const TABS = [
  { key: "general", labelKey: "orgSettings.general", href: (orgId: string) => `/org/${orgId}/settings/general` },
  { key: "users", labelKey: "orgSettings.users", href: (orgId: string) => `/org/${orgId}/settings/users` },
  { key: "roles", labelKey: "orgSettings.roles", href: (orgId: string) => `/org/${orgId}/settings/roles` },
  { key: "policies", labelKey: "orgSettings.policies", href: (orgId: string) => `/org/${orgId}/settings/policies` },
  { key: "assignments", labelKey: "orgSettings.assignments", href: (orgId: string) => `/org/${orgId}/settings/assignments` },
  { key: "effective", labelKey: "orgSettings.effectivePermissions", href: (orgId: string) => `/org/${orgId}/settings/effective` },
];

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const t = useTranslations();
  const orgId = params?.orgId ?? "";

  return (
    <div className="org-settings-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <section className="org-settings-shell">
        <header className="card card-pad org-settings-hero">
          <div className="org-settings-kicker">{t("orgSettings.organization")}</div>
          <div className="view-title">{t("navigation.orgSettings")}</div>
          <div className="view-sub">{t("orgSettings.manageDescription")}</div>
        </header>

        <div className="card card-pad org-settings-tabs-card overflow-x-auto">
          <nav className="org-settings-tabs" aria-label={t("orgSettings.sectionsAriaLabel")}>
            {TABS.map((tab) => {
              const href = tab.href(orgId);
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={clsx(
                    "btn",
                    "org-settings-tab-btn",
                    active ? "btn-primary org-settings-tab-btn-active" : "btn-outline"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {t(tab.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="org-settings-content">{children}</div>
      </section>
    </div>
  );
}
