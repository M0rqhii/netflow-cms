"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import {
  createRbacRole,
  deleteRbacRole,
  fetchRbacCapabilities,
  fetchRbacRoles,
  getAuthToken,
  decodeAuthToken,
  updateRbacRole,
  type RbacRole,
} from '@/lib/api';
import { CAPABILITY_MODULES, type CapabilityKey, type CapabilityModule, type RbacCapability } from '@repo/schemas';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, LoadingSpinner } from '@repo/ui';
import Badge from '@/components/ui/Badge';
import SearchAndFilters from '@/components/ui/SearchAndFilters';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { toFriendlyMessage } from '@/lib/errors';

type RoleEditorState = {
  name: string;
  description: string;
  scope: 'ORG' | 'SITE';
  capabilityKeys: CapabilityKey[];
};

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

const BLOCKED_CUSTOM_ROLE_KEYS = new Set<CapabilityKey>([
  'org.roles.manage',
  'org.policies.manage',
  'builder.custom_code',
  'builder.site_roles.manage',
]);

const DANGEROUS_CAPABILITY_KEYS = new Set<CapabilityKey>([
  'builder.custom_code',
  'domains.dns.manage',
  'marketing.ads.manage',
]);

const SYSTEM_ROLE_MARKERS = new Set(['SYSTEM', 'SYSTEM_ROLE', 'SYSTEM-ROLE']);

function normalizeRoleScope(scope?: string | null): string {
  return String(scope ?? '').toUpperCase();
}

function normalizeRoleType(type?: string | null): string {
  return String(type ?? '').toUpperCase();
}

function isSystemRole(role: RbacRole): boolean {
  const type = normalizeRoleType(role.type);
  return role.isImmutable || SYSTEM_ROLE_MARKERS.has(type) || type.startsWith('SYSTEM');
}

function isBlockedForCustomRole(capability: RbacCapability): boolean {
  if (capability.key.startsWith('billing.')) return true;
  if (BLOCKED_CUSTOM_ROLE_KEYS.has(capability.key)) return true;
  return Boolean(capability.metadata?.blockedForCustomRoles);
}

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? '').toLowerCase();
  return roleMarker === 'org_owner' || roleMarker === 'owner' || roleMarker === 'platform_owner';
}

export default function OrgRolesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editorRoleId, setEditorRoleId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<RoleEditorState>({
    name: '',
    description: '',
    scope: 'SITE',
    capabilityKeys: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [capabilitySearch, setCapabilitySearch] = useState('');
  const [capabilityModuleFilter, setCapabilityModuleFilter] = useState('all');

  const isOwner = useMemo(() => getOwnerFlag(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, capabilitiesData] = await Promise.all([
        fetchRbacRoles(orgId),
        fetchRbacCapabilities(orgId),
      ]);
      setRoles(rolesData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(toFriendlyMessage(err, 'Nie udało się wczytać ról.'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [loadData, orgId]);

  const systemRoles = roles.filter((role) => isSystemRole(role));
  const customRoles = roles.filter((role) => !isSystemRole(role));

  const filteredCustomRoles = customRoles.filter((role) => {
    const matchesSearch =
      !searchQuery ||
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope = scopeFilter === 'all' || normalizeRoleScope(role.scope) === normalizeRoleScope(scopeFilter);
    return matchesSearch && matchesScope;
  });

  const visibleCapabilities = useMemo(() => {
    return capabilities.filter((capability) => (isOwner ? true : capability.module !== 'billing'));
  }, [capabilities, isOwner]);

  const filteredCapabilities = useMemo(() => {
    return visibleCapabilities.filter((capability) => {
      const matchesModule = capabilityModuleFilter === 'all' || capability.module === capabilityModuleFilter;
      const searchValue = `${capability.label} ${capability.key} ${capability.description ?? ''}`.toLowerCase();
      const matchesSearch = !capabilitySearch || searchValue.includes(capabilitySearch.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [visibleCapabilities, capabilityModuleFilter, capabilitySearch]);

  const groupedCapabilities = useMemo(() => {
    return CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== 'billing'))
      .map((module) => ({
        module,
        items: filteredCapabilities.filter((capability) => capability.module === module),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredCapabilities, isOwner]);

  const openEditor = (mode: 'create' | 'edit' | 'duplicate', role?: RbacRole) => {
    if (mode === 'create') {
      setEditorRoleId(null);
      setEditorState({ name: '', description: '', scope: 'SITE', capabilityKeys: [] });
    } else if (role) {
      setEditorRoleId(role.id);
      setEditorState({
        name: mode === 'duplicate' ? `${role.name} Copy` : role.name,
        description: role.description ?? '',
        scope: role.scope,
        capabilityKeys: role.capabilities.map((cap) => cap.key),
      });
    }
    setEditorMode(mode);
    setEditorOpen(true);
  };

  const toggleCapability = (key: CapabilityKey) => {
    setEditorState((prev) => {
      if (prev.capabilityKeys.includes(key)) {
        return { ...prev, capabilityKeys: prev.capabilityKeys.filter((item) => item !== key) };
      }
      return { ...prev, capabilityKeys: [...prev.capabilityKeys, key] };
    });
  };

  const handleSave = async () => {
    if (!editorState.name.trim()) {
      push({ tone: 'error', message: 'Nazwa roli jest wymagana.' });
      return;
    }
    if (editorState.capabilityKeys.length === 0) {
      push({ tone: 'error', message: 'Wybierz co najmniej jedno uprawnienie.' });
      return;
    }

    setSaving(true);
    try {
      if (editorMode === 'edit' && editorRoleId) {
        await updateRbacRole(orgId, editorRoleId, {
          name: editorState.name,
          description: editorState.description,
          capabilityKeys: editorState.capabilityKeys,
        });
        push({ tone: 'success', message: 'Rola została zaktualizowana.' });
      } else {
        await createRbacRole(orgId, {
          name: editorState.name,
          description: editorState.description,
          scope: editorState.scope,
          capabilityKeys: editorState.capabilityKeys,
        });
        push({ tone: 'success', message: 'Rola została utworzona.' });
      }
      setEditorOpen(false);
      setEditorState({ name: '', description: '', scope: 'SITE', capabilityKeys: [] });
      await loadData();
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się zapisać roli.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    setDeleting(true);
    try {
      await deleteRbacRole(orgId, deleteRoleId, true);
      push({ tone: 'success', message: 'Rola została usunięta.' });
      setDeleteRoleId(null);
      await loadData();
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się usunąć roli.') });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading roles..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeTab === 'system' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('system')}
        >
          System roles
        </Button>
        <Button
          variant={activeTab === 'custom' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('custom')}
        >
          Custom roles
        </Button>
        {activeTab === 'custom' && (
          <Button variant="primary" className="ml-auto" onClick={() => openEditor('create')}>
            Create role
          </Button>
        )}
      </div>

      {activeTab === 'system' ? (
        <div className="space-y-4">
          {systemRoles.length === 0 ? (
            <EmptyState title="No system roles" description="System roles will appear here once available." />
          ) : (
            systemRoles.map((role) => {
              const expanded = expandedRoles[role.id] ?? false;
              const visibleRoleCaps = (role.capabilities || []).filter((cap) =>
                isOwner ? true : cap.module !== 'billing',
              );
              return (
                <Card key={role.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <p className="text-sm text-muted">{role.description || 'System role preset.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="default" className="uppercase">{role.scope}</Badge>
                      <Badge tone="success">System</Badge>
                      <Button variant="outline" size="sm" onClick={() =>
                        setExpandedRoles((prev) => ({ ...prev, [role.id]: !expanded }))
                      }>
                        {expanded ? 'Ukryj uprawnienia' : 'Pokaż uprawnienia'}
                      </Button>
                    </div>
                  </CardHeader>
                  {expanded && (
                    <CardContent>
                      {visibleRoleCaps.length === 0 ? (
                        <p className="text-sm text-muted">Brak uprawnień do pokazania.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Uprawnienie</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Module</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {visibleRoleCaps.map((cap) => (
                                <TableRow key={`${role.id}-${cap.key}`}>
                                  <TableCell className="font-medium">{cap.label ?? cap.key}</TableCell>
                                  <TableCell className="text-sm text-muted">{cap.key}</TableCell>
                                  <TableCell>{MODULE_LABELS[cap.module]}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search custom roles"
            filters={[
              {
                key: 'scope',
                label: 'Scope',
                value: scopeFilter,
                options: [
                  { value: 'all', label: 'All' },
                  { value: 'ORG', label: 'ORG' },
                  { value: 'SITE', label: 'SITE' },
                ],
                onChange: setScopeFilter,
              },
            ]}
          />

          {filteredCustomRoles.length === 0 ? (
              <EmptyState
                title="No custom roles"
                description="Stwórz rolę, wybierając uprawnienia w modułach."
                action={{ label: 'Create role', onClick: () => openEditor('create') }}
              />
            ) : (
            filteredCustomRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <p className="text-sm text-muted">{role.description || 'Custom role'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="default" className="uppercase">{role.scope}</Badge>
                    <Badge tone="warning">Custom</Badge>
                    <span className="text-xs text-muted">{role.capabilities.length} uprawnień</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted">
                    {role.capabilities.slice(0, 4).map((cap) => cap.label ?? cap.key).join(', ')}
                    {role.capabilities.length > 4 ? '...' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditor('edit', role)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditor('duplicate', role)}>
                      Duplicate
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteRoleId(role.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editorMode === 'edit' ? 'Edit custom role' : editorMode === 'duplicate' ? 'Duplicate role' : 'Create custom role'}
        className="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Role name</label>
              <Input
                value={editorState.name}
                onChange={(event) => setEditorState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Role name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                Scope
                <span className="text-xs text-muted font-normal" title={editorState.scope === 'ORG' ? 'ORG scope: This role applies to all sites in the organization. Users with this role have the same permissions across all sites.' : 'SITE scope: This role applies only to a specific site. Users need to be assigned this role per site.'}>
                  (i) {editorState.scope === 'ORG' ? 'Organization-wide' : 'Site-specific'}
                </span>
              </label>
              <select
                className="border rounded w-full p-2 bg-gray-50"
                value={editorState.scope}
                onChange={(event) => setEditorState((prev) => ({ ...prev, scope: event.target.value as 'ORG' | 'SITE' }))}
                disabled={editorMode === 'edit'}
              >
                <option value="ORG">ORG - Organization-wide (all sites)</option>
                <option value="SITE">SITE - Site-specific (one site only)</option>
              </select>
              <p className="text-xs text-muted mt-1">
                {editorState.scope === 'ORG' 
                  ? 'This role will apply to all sites in the organization. Users assigned this role will have the same permissions across all sites.'
                  : 'This role will apply only to a specific site. Users need to be assigned this role separately for each site where they should have these permissions.'}
              </p>
              {editorMode === 'edit' && (
                <p className="text-xs text-amber-600 mt-1">Uwaga: nie można zmienić zakresu dla istniejących ról.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={editorState.description}
                onChange={(event) => setEditorState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-muted mb-1">Szukaj uprawnień</label>
                <Input
                  value={capabilitySearch}
                  onChange={(event) => setCapabilitySearch(event.target.value)}
                  placeholder="Search by label or key"
                />
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-semibold text-muted mb-1">Module</label>
                <select
                  className="border rounded w-full p-2 bg-white"
                  value={capabilityModuleFilter}
                  onChange={(event) => setCapabilityModuleFilter(event.target.value)}
                >
                  <option value="all">All modules</option>
                  {CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== 'billing')).map((module) => (
                    <option key={module} value={module}>
                      {MODULE_LABELS[module]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {groupedCapabilities.length === 0 ? (
              <p className="text-sm text-muted">Brak wyników dla wybranych filtrów.</p>
            ) : (
              <div className="space-y-6">
                {groupedCapabilities.map((group) => (
                  <div key={group.module}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold">{MODULE_LABELS[group.module]}</h4>
                      <span className="text-xs text-muted">{group.items.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {group.items.map((capability) => {
                        const policyDisabled = capability.policyEnabled === false;
                        const blocked = isBlockedForCustomRole(capability);
                        const disabled = policyDisabled || blocked;
                        const checked = editorState.capabilityKeys.includes(capability.key);
                        const checkboxId = `cap-${capability.key}`;
                        const tooltip = policyDisabled
                          ? 'Ta opcja jest obecnie wy??czona w ustawieniach organizacji.'
                          : blocked
                          ? 'Ta opcja jest zarezerwowana dla ról systemowych.'
                          : undefined;

                        return (
                          <label
                            key={capability.key}
                            htmlFor={checkboxId}
                            className={clsx(
                              'flex items-start gap-3 rounded border p-3 bg-white',
                              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400',
                            )}
                            title={tooltip}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleCapability(capability.key)}
                            />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{capability.label}</span>
                                {capability.isDangerous || DANGEROUS_CAPABILITY_KEYS.has(capability.key) ? (
                                  <Badge tone="error">Dangerous</Badge>
                                ) : null}
                                {capability.canBePolicyControlled ? (
                                  <span
                                    className="text-xs text-amber-600 font-semibold cursor-help"
                                    title="Ta opcja może być włączona lub wyłączona w ustawieniach organizacji."
                                  >
                                    ! Ograniczenie
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-muted">{capability.key}</div>
                              {capability.description ? (
                                <div className="text-xs text-muted mt-1">{capability.description}</div>
                              ) : null}
                              {blocked && (
                                <div className="text-xs text-amber-700 mt-1">
                                  Zarezerwowane dla ról systemowych.
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">
              Role systemowe są stałe. Role niestandardowe tworzysz, wybierając uprawnienia w modułach.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} isLoading={saving}>
                {editorMode === 'edit' ? 'Save changes' : 'Create role'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRoleId)}
        onClose={() => setDeleteRoleId(null)}
        onConfirm={handleDelete}
        title="Delete role"
        message="This will remove the role and all assignments. Continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
