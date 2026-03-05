"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import clsx from "clsx";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

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
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: `Org ${orgId}` },
          { label: "Settings" },
        ]}
      />

      <div className="card card-pad">
        <div className="view-title">Organization Settings</div>
        <div className="view-sub">Manage your organization settings, roles, policies, and access control.</div>
      </div>

      <div className="spacer" />

      <div className="card" style={{ padding: 14, borderRadius: 18, overflow: "auto" }}>
        <nav className="flex flex-wrap gap-2" aria-label="Tabs">
          {TABS.map((tab) => {
            const href = tab.href(orgId);
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={tab.key}
                href={href}
                className={clsx(
                  "btn",
                  active ? "" : ""
                )}
                style={active ? { background: "rgba(0,163,255,.14)", borderColor: "rgba(0,163,255,.30)" } : undefined}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="spacer" />

      {children}
    </div>
  );
}
