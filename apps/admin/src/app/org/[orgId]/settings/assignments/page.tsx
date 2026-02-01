"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  createRbacAssignment,
  deleteRbacAssignment,
  fetchMySites,
  fetchRbacAssignments,
  fetchRbacRoles,
  fetchOrgUsers,
  type RbacAssignment,
  type RbacRole,
  type UserSummary,
} from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingSpinner } from '@repo/ui';
import Badge from '@/components/ui/Badge';
import SearchAndFilters from '@/components/ui/SearchAndFilters';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { toFriendlyMessage } from '@/lib/errors';

function normalizeRoleScope(scope?: string | null): string {
  return String(scope ?? '').toUpperCase();
}

function normalizeRoleType(type?: string | null): string {
  return String(type ?? '').toUpperCase();
}

export default function OrgAssignmentsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [assignments, setAssignments] = useState<RbacAssignment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [orgRoleId, setOrgRoleId] = useState('');
  const [siteRoleId, setSiteRoleId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [removeAssignmentId, setRemoveAssignmentId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const orgRoles = roles.filter((role) => normalizeRoleScope(role.scope) === 'ORG');
  const siteRoles = roles.filter((role) => normalizeRoleScope(role.scope) === 'SITE');

  const siteMap = useMemo(() => {
    return new Map(sites.map((site) => [site.siteId, site.site.name]));
  }, [sites]);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, orgRolesData, siteRolesData, sitesData] = await Promise.all([
        fetchOrgUsers(orgId),
        fetchRbacRoles(orgId, 'ORG'),
        fetchRbacRoles(orgId, 'SITE'),
        fetchMySites(),
      ]);
      setUsers(usersData);
      setRoles([...(orgRolesData || []), ...(siteRolesData || [])]);
      setSites(sitesData);
    } catch (err) {
      setError(toFriendlyMessage(err, 'Nie udało się wczytać danych przypisań.'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadAssignments = useCallback(async (userId: string) => {
    if (!userId) {
      setAssignments([]);
      return;
    }
    setLoadingAssignments(true);
    try {
      const data = await fetchRbacAssignments(orgId, { userId });
      setAssignments(data);
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się wczytać przypisań.') });
    } finally {
      setLoadingAssignments(false);
    }
  }, [orgId, push]);

  useEffect(() => {
    if (!orgId) return;
    loadBaseData();
  }, [loadBaseData, orgId]);

  useEffect(() => {
    loadAssignments(selectedUserId);
  }, [loadAssignments, selectedUserId]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesScope = scopeFilter === 'all' || normalizeRoleScope(assignment.role.scope) == normalizeRoleScope(scopeFilter);
      const searchValue = `${assignment.role.name} ${normalizeRoleScope(assignment.role.scope)} ${normalizeRoleType(assignment.role.type)}`.toLowerCase();
      const matchesSearch = !searchQuery || searchValue.includes(searchQuery.toLowerCase());
      return matchesScope && matchesSearch;
    });
  }, [assignments, scopeFilter, searchQuery]);

  const handleAssignOrgRole = async () => {
    if (!selectedUserId || !orgRoleId) {
      push({ tone: 'error', message: 'Wybierz użytkownika i rolę organizacji.' });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: orgRoleId, siteId: null });
      push({ tone: 'success', message: 'Org role assigned.' });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się przypisać roli.') });
    }
  };

  const handleAssignSiteRole = async () => {
    if (!selectedUserId || !siteRoleId || !siteId) {
      push({ tone: 'error', message: 'Wybierz stronę, aby przypisać tę rolę.' });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: siteRoleId, siteId });
      push({ tone: 'success', message: 'Site role assigned.' });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się przypisać roli.') });
    }
  };

  const handleRemoveAssignment = async () => {
    if (!removeAssignmentId) return;
    setRemoving(true);
    try {
      await deleteRbacAssignment(orgId, removeAssignmentId);
      push({ tone: 'success', message: 'Assignment removed.' });
      setRemoveAssignmentId(null);
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: 'error', message: toFriendlyMessage(err, 'Nie udało się usunąć przypisania.') });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading assignments..." />;
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
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Assignments pokazuje przypisane role. Realny dostęp (po uwzględnieniu polityk organizacji) zobaczysz w zakładce{' '}
            <Link className="font-semibold underline underline-offset-2" href={`/org/${orgId}/settings/effective`}>
              Effective
            </Link>.
          </div>
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Assign org role</h3>
              <select
                className="border rounded w-full p-2 bg-white"
                value={orgRoleId}
                onChange={(event) => setOrgRoleId(event.target.value)}
              >
                <option value="">Select org role</option>
                {orgRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({normalizeRoleType(role.type) || 'ROLE'})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleAssignOrgRole}
                disabled={!selectedUserId}
                title={!selectedUserId ? 'Wybierz użytkownika, aby przypisać rolę.' : undefined}
              >
                Assign org role
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Assign site role</h3>
              <select
                className="border rounded w-full p-2 bg-white"
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
              >
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.site.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded w-full p-2 bg-white"
                value={siteRoleId}
                onChange={(event) => setSiteRoleId(event.target.value)}
              >
                <option value="">Select site role</option>
                {siteRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({normalizeRoleType(role.type) || 'ROLE'})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleAssignSiteRole}
                disabled={!selectedUserId}
                title={!selectedUserId ? 'Wybierz użytkownika, aby przypisać rolę.' : undefined}
              >
                Assign site role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <EmptyState
              title="Select a user"
              description="Choose a user to view and manage role assignments."
            />
          ) : (
            <>
              <SearchAndFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Search assignments"
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

              {loadingAssignments ? (
                <LoadingSpinner text="Loading assignments..." />
              ) : filteredAssignments.length === 0 ? (
                <EmptyState
                  title="No assignments"
                  description="This user has no role assignments."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Assignments table</caption>
                    <thead>
                      <tr className="text-left text-muted border-b">
                        <th className="py-3 px-4 font-semibold">Role</th>
                        <th className="py-3 px-4 font-semibold">Scope</th>
                        <th className="py-3 px-4 font-semibold">Site</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map((assignment) => (
                        <tr key={assignment.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{assignment.role.name}</div>
                            <div className="text-xs text-muted">{normalizeRoleType(assignment.role.type) || 'ROLE'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge tone="default" className="uppercase">
                              {assignment.role.scope}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {assignment.role.scope === 'ORG'
                              ? 'Organization'
                              : siteMap.get(assignment.siteId ?? '') || assignment.siteId || 'Unknown'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="danger" size="sm" onClick={() => setRemoveAssignmentId(assignment.id)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(removeAssignmentId)}
        onClose={() => setRemoveAssignmentId(null)}
        onConfirm={handleRemoveAssignment}
        title="Remove assignment"
        message="This will remove the role assignment from the user. Continue?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        loading={removing}
      />
    </div>
  );
}
