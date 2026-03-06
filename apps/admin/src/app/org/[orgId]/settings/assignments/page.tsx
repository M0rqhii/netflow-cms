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
import { useTranslations } from "@/hooks/useTranslations";

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
  const t = useTranslations();

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
      setError(toFriendlyMessage(err, t("orgAssignments.failedToLoadAssignments")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

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
      push({ tone: "error", message: toFriendlyMessage(err, t("orgAssignments.failedToLoadAssignments")) });
    } finally {
      setLoadingAssignments(false);
    }
  }, [orgId, push, t]);

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
      push({ tone: "error", message: t("orgAssignments.selectUserAndOrgRole") });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: orgRoleId, siteId: null });
      push({ tone: "success", message: t("orgAssignments.orgRoleAssigned") });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgAssignments.failedToAssignRole")) });
    }
  };

  const handleAssignSiteRole = async () => {
    if (!selectedUserId || !siteRoleId || !siteId) {
      push({ tone: "error", message: t("orgAssignments.selectSiteAndRole") });
      return;
    }
    try {
      await createRbacAssignment(orgId, { userId: selectedUserId, roleId: siteRoleId, siteId });
      push({ tone: "success", message: t("orgAssignments.siteRoleAssigned") });
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgAssignments.failedToAssignRole")) });
    }
  };

  const handleRemoveAssignment = async () => {
    if (!removeAssignmentId) return;
    setRemoving(true);
    try {
      await deleteRbacAssignment(orgId, removeAssignmentId);
      push({ tone: "success", message: t("orgAssignments.assignmentRemoved") });
      setRemoveAssignmentId(null);
      await loadAssignments(selectedUserId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgAssignments.failedToRemoveAssignment")) });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("orgAssignments.loadingAssignments")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-pad">
        <div className="text-error">{error}</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={loadBaseData}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in org-settings-page">
      <div className="card card-pad">
        <div className="section-title">{t("orgAssignments.title")}</div>
        <div className="detail-label mt-1.5">
          {t("orgAssignments.description")}
        </div>
        <div className="spacer-sm" />
        <div className="card p-3 border border-sky-400/30 bg-sky-500/10">
          <span className="text-xs">
            {t("orgAssignments.seeEffectiveHere")} <Link className="btn" href={`/org/${orgId}/settings/effective`}>{t("orgAssignments.effective")}</Link>
          </span>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="grid gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgAssignments.user")}</label>
            <select className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">{t("orgAssignments.selectUser")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3">
            <div>
              <div className="detail-label mb-1">{t("orgAssignments.assignOrgRole")}</div>
              <select className="input" value={orgRoleId} onChange={(event) => setOrgRoleId(event.target.value)}>
                <option value="">{t("orgAssignments.selectOrgRole")}</option>
                {orgRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} ({normalizeRoleType(role.type) || "ROLE"})</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <button className="btn btn-primary" onClick={handleAssignOrgRole} disabled={!selectedUserId}>{t("orgAssignments.assignOrgRole")}</button>
            </div>
            <div>
              <div className="detail-label mb-1">{t("orgAssignments.assignSiteRole")}</div>
              <select className="input" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
                <option value="">{t("orgAssignments.selectSite")}</option>
                {sites.map((site) => (
                  <option key={site.siteId} value={site.siteId}>{site.site.name}</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <select className="input" value={siteRoleId} onChange={(event) => setSiteRoleId(event.target.value)}>
                <option value="">{t("orgAssignments.selectSiteRole")}</option>
                {siteRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} ({normalizeRoleType(role.type) || "ROLE"})</option>
                ))}
              </select>
              <div className="spacer-sm" />
              <button className="btn btn-primary" onClick={handleAssignSiteRole} disabled={!selectedUserId}>{t("orgAssignments.assignSiteRole")}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("orgAssignments.currentAssignments")}</div>
        <div className="spacer-sm" />
        {!selectedUserId ? (
          <div className="text-muted">{t("orgAssignments.selectUserToViewAssignments")}</div>
        ) : (
          <>
            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder={t("orgAssignments.searchAssignments")}
              filters={[
                {
                  key: "scope",
                  label: t("orgAssignments.scope"),
                  value: scopeFilter,
                  options: [
                    { value: "all", label: t("common.all") },
                    { value: "ORG", label: "ORG" },
                    { value: "SITE", label: "SITE" },
                  ],
                  onChange: setScopeFilter,
                },
              ]}
            />

            <div className="spacer-sm" />

            {loadingAssignments ? (
              <div className="text-muted">{t("orgAssignments.loadingAssignments")}</div>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-muted">{t("orgAssignments.noAssignmentsForUser")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("orgAssignments.columns.role")}</th>
                      <th>{t("orgAssignments.columns.scope")}</th>
                      <th>{t("orgAssignments.columns.site")}</th>
                      <th className="text-right">{t("common.actions")}</th>
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
                          {assignment.role.scope === "ORG" ? t("orgAssignments.organization") : siteMap.get(assignment.siteId ?? "") || assignment.siteId || t("orgAssignments.unknown")}
                        </td>
                        <td className="text-right">
                          <button className="btn" onClick={() => setRemoveAssignmentId(assignment.id)}>{t("orgAssignments.remove")}</button>
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
        title={t("orgAssignments.removeAssignmentTitle")}
        message={t("orgAssignments.removeAssignmentMessage")}
        confirmLabel={t("orgAssignments.remove")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={removing}
      />
    </div>
  );
}
