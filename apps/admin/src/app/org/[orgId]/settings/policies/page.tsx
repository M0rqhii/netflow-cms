"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import {
  fetchRbacCapabilities,
  updateRbacPolicy,
  getAuthToken,
  decodeAuthToken,
} from '@/lib/api';
import { CAPABILITY_MODULES, type CapabilityModule, type RbacCapability } from '@repo/schemas';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingSpinner } from '@repo/ui';
import Badge from '@/components/ui/Badge';
import SearchAndFilters from '@/components/ui/SearchAndFilters';
import { useToast } from '@/components/ui/Toast';

const MODULE_LABELS: Record<CapabilityModule, string> = {
  org: 'Organization',
  billing: 'Billing',
  sites: 'Sites',
  builder: 'Builder',
  content: 'Content',
  hosting: 'Hosting',
  domains: 'Domains',
  marketing: 'Marketing',
  analytics: 'Analytics',
};

const DANGEROUS_CAPABILITY_KEYS = new Set([
  'builder.custom_code',
  'domains.dns.manage',
  'marketing.ads.manage',
]);

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? '').toLowerCase();
  return roleMarker === 'org_owner' || roleMarker === 'owner' || roleMarker === 'platform_owner';
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition',
        checked ? 'bg-emerald-500' : 'bg-gray-300',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90',
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function OrgPoliciesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const isOwner = useMemo(() => getOwnerFlag(), []);

  const loadCapabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRbacCapabilities(orgId);
      setCapabilities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    loadCapabilities();
  }, [orgId]);

  const filteredCapabilities = useMemo(() => {
    return capabilities.filter((capability) => {
      if (!isOwner && capability.module === 'billing') return false;
      const matchesModule = moduleFilter === 'all' || capability.module === moduleFilter;
      const searchValue = `${capability.label} ${capability.key} ${capability.description ?? ''}`.toLowerCase();
      const matchesSearch = !searchQuery || searchValue.includes(searchQuery.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [capabilities, moduleFilter, searchQuery, isOwner]);

  const groupedCapabilities = useMemo(() => {
    return CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== 'billing'))
      .map((module) => ({
        module,
        items: filteredCapabilities.filter((capability) => capability.module === module),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredCapabilities, isOwner]);

  const handleToggle = async (capability: RbacCapability) => {
    if (!capability.canBePolicyControlled) return;
    const nextValue = !(capability.policyEnabled ?? true);
    setUpdatingKey(capability.key);
    try {
      await updateRbacPolicy(orgId, capability.key, nextValue);
      setCapabilities((prev) =>
        prev.map((item) =>
          item.key === capability.key ? { ...item, policyEnabled: nextValue } : item,
        ),
      );
      push({ tone: 'success', message: 'Policy updated.' });
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update policy.' });
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading policies..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <button className="mt-4 inline-flex items-center justify-center rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization policies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            ⚠️ Policy-controlled capabilities can be enabled or disabled for the entire organization. Disabled
            capabilities cannot be assigned in custom roles.
          </p>
        </CardContent>
      </Card>

      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search capabilities"
        filters={[
          {
            key: 'module',
            label: 'Module',
            value: moduleFilter,
            options: [
              { value: 'all', label: 'All' },
              ...CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== 'billing')).map((module) => ({
                value: module,
                label: MODULE_LABELS[module],
              })),
            ],
            onChange: setModuleFilter,
          },
        ]}
      />

      {groupedCapabilities.length === 0 ? (
        <EmptyState title="No capabilities" description="No capabilities match the current filters." />
      ) : (
        groupedCapabilities.map((group) => (
          <Card key={group.module}>
            <CardHeader>
              <CardTitle className="text-lg">{MODULE_LABELS[group.module]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Policies for {MODULE_LABELS[group.module]}</caption>
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">Capability</th>
                      <th className="py-3 px-4 font-semibold">Key</th>
                      <th className="py-3 px-4 font-semibold">Policy</th>
                      <th className="py-3 px-4 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((capability) => {
                      const policyEnabled = capability.policyEnabled ?? true;
                      const toggleDisabled = !capability.canBePolicyControlled || updatingKey === capability.key;
                      return (
                        <tr key={capability.key} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {capability.label}
                              {capability.canBePolicyControlled ? (
                                <span className="text-xs text-amber-600 font-semibold">⚠️</span>
                              ) : null}
                            </div>
                            {capability.description ? (
                              <div className="text-xs text-muted mt-1">{capability.description}</div>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 align-top text-muted">{capability.key}</td>
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-center gap-3">
                              <ToggleSwitch
                                checked={policyEnabled}
                                disabled={toggleDisabled}
                                onChange={() => handleToggle(capability)}
                              />
                              <span className="text-xs text-muted">
                                {!capability.canBePolicyControlled ? 'Fixed' : policyEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            {capability.isDangerous || DANGEROUS_CAPABILITY_KEYS.has(capability.key) ? (
                              <Badge tone="warning">Dangerous</Badge>
                            ) : (
                              <Badge tone="default">{capability.riskLevel}</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
