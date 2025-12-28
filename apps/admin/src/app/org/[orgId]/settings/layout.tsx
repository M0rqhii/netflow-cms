"use client";

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import clsx from 'clsx';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

const TABS = [
  { key: 'roles', label: 'Roles', href: (orgId: string) => `/org/${orgId}/settings/roles` },
  { key: 'policies', label: 'Policies', href: (orgId: string) => `/org/${orgId}/settings/policies` },
  { key: 'assignments', label: 'Assignments', href: (orgId: string) => `/org/${orgId}/settings/assignments` },
  { key: 'effective', label: 'Effective', href: (orgId: string) => `/org/${orgId}/settings/effective` },
];

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const orgId = params?.orgId ?? '';

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: `Org ${orgId}` },
          { label: 'Settings' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">RBAC Settings</h1>
        <p className="text-sm text-muted">
          Roles, policies, assignments, and effective permissions for this organization.
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex flex-wrap gap-2" aria-label="RBAC settings tabs">
          {TABS.map((tab) => {
            const href = tab.href(orgId);
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={tab.key}
                href={href}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-t-md border',
                  active
                    ? 'bg-white border-gray-200 border-b-white text-foreground'
                    : 'bg-gray-50 border-transparent text-muted hover:text-foreground hover:bg-white',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
