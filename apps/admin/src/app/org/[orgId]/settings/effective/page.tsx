"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  decodeAuthToken,
  fetchMySites,
  fetchRbacCapabilities,
  fetchRbacEffectivePermissions,
  fetchOrgUsers,
  getAuthToken,
  type EffectivePermission,
  type UserSummary,
} from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { CAPABILITY_MODULES, type CapabilityModule, type RbacCapability } from '@repo/schemas';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingSpinner } from '@repo/ui';
import Badge from '@/components/ui/Badge';
import SearchAndFilters from '@/components/ui/SearchAndFilters';
import { useToast } from '@/components/ui/Toast';
import { toFriendlyMessage } from '@/lib/errors';

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

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? '').toLowerCase();
  return roleMarker === 'org_owner' || roleMarker === 'owner' || roleMarker === 'platform_owner';
}

export default function OrgEffectivePermissionsPage() {
  const params = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const orgId = params?.orgId ?? '';
  const defaultSiteId = searchParams?.get('siteId') ?? '';
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [effective, setEffective] = useState<EffectivePermission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId);
  const [loadingEffective, setLoadingEffective] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const isOwner = useMemo(() => getOwnerFlag(), []);

  const loadBaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, sitesData, capabilitiesData] = await Promise.all([
        fetchOrgUsers(orgId),
        fetchMySites(),
        fetchRbacCapabilities(orgId),
      ]);
      setUsers(usersData);
      setSites(sitesData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(toFriendlyMessage(err, 'Nie udało się wczytać danych uprawnień.'));
    } finally {
      setLoading(false);
    }
  };

  const loadEffective = async (userId: string, siteId?: string) => {
    if (!userId) {
      setEffective([]);
      return;
    }
    setLoadingEffective(true);
    try {
      const data = await fetchRbacEffectivePermissions(orgId, {
        userId,
        siteId: siteId ? siteId : null,
      });
      setEffective(data);
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się wczytać uprawnień.') });
    } finally {
      setLoadingEffective(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    loadBaseData();
  }, [orgId]);

  useEffect(() => {
    loadEffective(selectedUserId, selectedSiteId);
  }, [selectedUserId, selectedSiteId]);

  const effectiveMap = useMemo(() => {
    return new Map(effective.map((item) => [item.key, item]));
  }, [effective]);

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

  const resolveRoleSources = (entry?: EffectivePermission) => {
    if (!entry?.roleSources || entry.roleSources.length === 0) return '—';
    return entry.roleSources
      .map((source) => {
        if (typeof source === 'string') return source;
        return source.roleName || source.name || source.id || 'Unknown';
      })
      .join(', ');
  };

  if (loading) {
    return <LoadingSpinner text="Loading effective permissions..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadBaseData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Effective permissions
            <span 
              className="text-sm text-muted font-normal cursor-help"
              title="To jest realny dostęp po połączeniu ról organizacji i stron oraz ustawień organizacji."
            >
              (ℹ️ Realny dostęp)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Jak to działa:</strong> Łączymy role organizacji i stron z ustawieniami organizacji, aby pokazać realny dostęp. Wybierz użytkownika i opcjonalnie stronę, aby zobaczyć wynik.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">User</label>
              <select
                className="border rounded w-full p-2 bg-white"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site (optional)</label>
              <select
                className="border rounded w-full p-2 bg-white"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
              >
                <option value="">Organization scope</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Szukaj opcji"
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

      {!selectedUserId ? (
        <EmptyState title="Wybierz użytkownika" description="Wybierz użytkownika, aby zobaczyć realny dostęp." />
      ) : loadingEffective ? (
        <LoadingSpinner text="Liczenie dostępu..." />
      ) : groupedCapabilities.length === 0 ? (
        <EmptyState title="Brak opcji" description="Nic nie pasuje do wybranych filtrów." />
      ) : (
        groupedCapabilities.map((group) => (
          <Card key={group.module}>
            <CardHeader>
              <CardTitle className="text-lg">{MODULE_LABELS[group.module]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Effective permissions for {MODULE_LABELS[group.module]}</caption>
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-3 px-4 font-semibold">Opcja</th>
                      <th className="py-3 px-4 font-semibold">Dostęp</th>
                      <th className="py-3 px-4 font-semibold">Ustawienie</th>
                      <th className="py-3 px-4 font-semibold">Powód</th>
                      <th className="py-3 px-4 font-semibold">Źródła ról</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((capability) => {
                      const entry = effectiveMap.get(capability.key);
                      const allowed = entry?.allowed ?? false;
                      const policyEnabled = entry?.policyEnabled ?? capability.policyEnabled ?? true;
                      const reason =
                        entry?.reason ||
                        (allowed ? 'Z roli' : policyEnabled ? 'Brak w rolach' : 'Wyłączone w ustawieniach organizacji');
                      return (
                        <tr key={capability.key} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold">{capability.label}</div>
                            <div className="text-xs text-muted">{capability.key}</div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <Badge tone={allowed ? 'success' : 'default'}>
                              {allowed ? 'Tak' : 'Nie'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <Badge tone={policyEnabled ? 'success' : 'error'}>
                              {policyEnabled ? 'Włączone' : 'Wyłączone'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 align-top text-sm text-muted">{reason}</td>
                          <td className="py-3 px-4 align-top text-sm">{resolveRoleSources(entry)}</td>
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
