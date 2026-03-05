"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import SearchAndFilters from "@/components/ui/SearchAndFilters";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";

function normalizeRoleScope(scope?: string | null): string {
  return String(scope ?? "").toUpperCase();
}

function normalizeRoleType(type?: string | null): string {
  return String(type ?? "").toUpperCase();
}

export default function OrgAssignmentsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [assignments, setAssignments] = useState<RbacAssignment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [orgRoleId, setOrgRoleId] = useState("");
  const [siteRoleId, setSiteRoleId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [removeAssignmentId, setRemoveAssignmentId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const orgRoles = roles.filter((role) => normalizeRoleScope(role.scope) === "ORG");
  const siteRoles = roles.filter((role) => normalizeRoleScope(role.scope) === "SITE");

  const siteMap = useMemo(() => new Map(sites.map((site) => [site.siteId, site.site.name])), [sites]);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, orgRolesData, siteRolesData, sitesData] = await Promise.all([
        fetchOrgUsers(orgId),
        fetchRbacRoles(orgId, "ORG"),
        fetchRbacRoles(orgId, "SITE"),
        fetchMySites(),
      ]);
      setUsers(usersData);
      setRoles([...(orgRolesData || []), ...(siteRolesData || [])]);
      setSites(sitesData);
    } catch (err) {
      setError(toFriendlyMessage(err, "Failed to load assignments."));
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
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to load assignments.") });
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
      const matchesScope = scopeFilter === "all" || normalizeRoleScope(assignment.role.scope) === normalizeRoleScope(scopeFilter);
      const searchValue = `${assignment.role.name} ${normalizeRoleScope(assignment.role.scope)} ${normalizeRoleType(assignment.role.type)}`.toLowerCase();
      const matchesSearch = !searchQuery || searchValue.includes(searchQuery.toLowerCase());
      return matchesScope && matchesSearch;
    });
  }, [assignments, scopeFilter, searchQuery]);

  const handleAssignOrgRole = async () => {
    if (!selectedUserId || !orgRoleId) {
      push({ tone: "error", message: "Select a user and an org role." });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: orgRoleId, siteId: null });
      push({ tone: "success", message: "Org role assigned." });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to assign role.") });
    }
  };

  const handleAssignSiteRole = async () => {
    if (!selectedUserId || !siteRoleId || !siteId) {
      push({ tone: "error", message: "Select a site and a role." });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: siteRoleId, siteId });
      push({ tone: "success", message: "Site role assigned." });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to assign role.") });
    }
  };

  const handleRemoveAssignment = async () => {
    if (!removeAssignmentId) return;
    setRemoving(true);
    try {
      await deleteRbacAssignment(orgId, removeAssignmentId);
      push({ tone: "success", message: "Assignment removed." });
      setRemoveAssignmentId(null);
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to remove assignment.") });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-pad">
        <div className="text-error">{error}</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={loadBaseData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="card card-pad">
        <div className="section-title">Assignments</div>
        <div className="detail-label mt-1.5">
          Assign roles to users. Real access is shown in the Effective tab.
        </div>
        <div className="spacer-sm" />
        <div className="card p-3 border border-sky-400/30 bg-sky-500/10">
          <span className="text-xs">
            See effective permissions here: <Link className="btn" href={`/org/${orgId}/settings/effective`}>Effective</Link>
          </span>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="grid gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">User</label>
            <select className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3">
            <div>
              <div className="detail-label mb-1">Assign org role</div>
              <select className="input" value={orgRoleId} onChange={(event) => setOrgRoleId(event.target.value)}>
                <option value="">Select org role</option>
                {orgRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} ({normalizeRoleType(role.type) || "ROLE"})</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <button className="btn btn-primary" onClick={handleAssignOrgRole} disabled={!selectedUserId}>Assign org role</button>
            </div>
            <div>
              <div className="detail-label mb-1">Assign site role</div>
              <select className="input" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>{site.site.name}</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <select className="input" value={siteRoleId} onChange={(event) => setSiteRoleId(event.target.value)}>
                <option value="">Select site role</option>
                {siteRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} ({normalizeRoleType(role.type) || "ROLE"})</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <button className="btn btn-primary" onClick={handleAssignSiteRole} disabled={!selectedUserId}>Assign site role</button>
            </div>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">Current assignments</div>
        <div className="spacer-sm" />
        {!selectedUserId ? (
          <div className="text-muted">Select a user to view assignments.</div>
        ) : (
          <>
            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search assignments"
              filters={[
                {
                  key: "scope",
                  label: "Scope",
                  value: scopeFilter,
                  options: [
                    { value: "all", label: "All" },
                    { value: "ORG", label: "ORG" },
                    { value: "SITE", label: "SITE" },
                  ],
                  onChange: setScopeFilter,
                },
              ]}
            />

            <div className="spacer-sm" />

            {loadingAssignments ? (
              <div className="text-muted">Loading assignments...</div>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-muted">No assignments for this user.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Scope</th>
                      <th>Site</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <div className="font-bold">{assignment.role.name}</div>
                          <div className="detail-label">{normalizeRoleType(assignment.role.type) || "ROLE"}</div>
                        </td>
                        <td><span className="badge gray">{assignment.role.scope}</span></td>
                        <td>
                          {assignment.role.scope === "ORG" ? "Organization" : siteMap.get(assignment.siteId ?? "") || assignment.siteId || "Unknown"}
                        </td>
                        <td className="text-right">
                          <button className="btn" onClick={() => setRemoveAssignmentId(assignment.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

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
