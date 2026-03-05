"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { key: "general", label: "General", href: (orgId: string) => `/org/${orgId}/settings/general` },
  { key: "roles", label: "Roles", href: (orgId: string) => `/org/${orgId}/settings/roles` },
  { key: "policies", label: "Policies", href: (orgId: string) => `/org/${orgId}/settings/policies` },
  { key: "assignments", label: "Assignments", href: (orgId: string) => `/org/${orgId}/settings/assignments` },
  { key: "effective", label: "Effective", href: (orgId: string) => `/org/${orgId}/settings/effective` },
];

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const orgId = params?.orgId ?? "";

  return (
    <div className="org-settings-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <section className="org-settings-shell">
        <header className="card card-pad org-settings-hero">
          <div className="org-settings-kicker">Organization</div>
          <div className="view-title">Organization Settings</div>
          <div className="view-sub">Manage your organization settings, roles, policies, and access control.</div>
        </header>

        <div className="card card-pad org-settings-tabs-card overflow-x-auto">
          <nav className="org-settings-tabs" aria-label="Organization settings sections">
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
                  {tab.label}
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
