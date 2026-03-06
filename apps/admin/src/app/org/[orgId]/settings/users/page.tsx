"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyState, Input, Skeleton } from "@repo/ui";
import {
  createOrgUser,
  fetchOrgDashboard,
  fetchOrgUsers,
  fetchSiteInvites,
  inviteUserToSite,
  revokeInvite,
  type DashboardSiteCard,
  type InviteSummary,
  type UserSummary,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslations } from "@/hooks/useTranslations";

function normalizeRole(value: string): string {
  return value === "site_admin" ? "org_admin" : value;
}

export default function OrgUsersPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();
  const { language } = useLanguage();
  const t = useTranslations();
  const roleLabel = (value: string) => {
    const normalized = normalizeRole(value);
    if (normalized === "org_admin") return t("users.admin");
    if (normalized === "super_admin") return t("users.superAdmin");
    if (normalized === "editor") return t("users.editor");
    if (normalized === "viewer") return t("users.viewer");
    return normalized;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sites, setSites] = useState<DashboardSiteCard[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("viewer");
  const [creating, setCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [sendingInvite, setSendingInvite] = useState(false);

  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [inviteQuery, setInviteQuery] = useState("");

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [sites, selectedSiteId]
  );

  const loadBaseData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [usersData, dashboardData] = await Promise.all([fetchOrgUsers(orgId), fetchOrgDashboard(orgId)]);

      const nextSites = dashboardData?.sites ?? [];
      setUsers(usersData);
      setSites(nextSites);
      setSelectedSiteId((current) => {
        if (current && nextSites.some((site) => site.id === current)) return current;
        return nextSites[0]?.id ?? "";
      });
    } catch (err) {
      setError(toFriendlyMessage(err, t("users.failedToLoadOrganizationUsers")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  const loadInvites = useCallback(
    async (siteId: string) => {
      if (!siteId) {
        setInvites([]);
        return;
      }

      setLoadingInvites(true);
      try {
        const data = await fetchSiteInvites(siteId);
        setInvites(data);
      } catch (err) {
        push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToLoadInvites")) });
      } finally {
        setLoadingInvites(false);
      }
    },
    [push, t]
  );

  useEffect(() => {
    if (!orgId) return;
    loadBaseData();
  }, [loadBaseData, orgId]);

  useEffect(() => {
    loadInvites(selectedSiteId);
  }, [loadInvites, selectedSiteId]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = !userQuery || user.email.toLowerCase().includes(userQuery.toLowerCase());
      const matchesRole = !userRoleFilter || normalizeRole(user.role) === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userQuery, userRoleFilter]);

  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      const matchesSearch = !inviteQuery || invite.email.toLowerCase().includes(inviteQuery.toLowerCase());
      return matchesSearch;
    });
  }, [invites, inviteQuery]);

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!orgId || !createEmail.trim() || !createPassword) return;

    try {
      setCreating(true);
      await createOrgUser(orgId, {
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        role: createRole,
        preferredLanguage: language,
      });

      push({ tone: "success", message: `${t("users.userCreatedSuccessfully")}: ${createEmail}` });
      setCreateEmail("");
      setCreatePassword("");

      const usersData = await fetchOrgUsers(orgId);
      setUsers(usersData);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToCreateUser")) });
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSiteId || !inviteEmail.trim()) return;

    try {
      setSendingInvite(true);
      await inviteUserToSite(inviteEmail.trim().toLowerCase(), inviteRole, selectedSiteId);
      push({ tone: "success", message: `${t("users.inviteSentTo")} ${inviteEmail}` });
      setInviteEmail("");
      await loadInvites(selectedSiteId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToSendInvite")) });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!selectedSiteId) return;

    try {
      await revokeInvite(selectedSiteId, inviteId);
      push({ tone: "success", message: t("users.inviteRevoked") });
      await loadInvites(selectedSiteId);
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToRevokeInvite")) });
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <Skeleton variant="text" width={220} height={28} className="mb-4" />
        <Skeleton variant="rectangular" width="100%" height={280} />
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
        <div className="section-title">{t("users.title")}</div>
        <div className="detail-label mt-1.5">{t("users.manageOrganizationUsersAndInvites")}</div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.organizationUsers")}</div>
        <div className="spacer-sm" />
        <div className="row-wrap" style={{ marginBottom: 10 }}>
          <Input
            label={t("common.search")}
            placeholder={t("users.searchByEmail")}
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            className="w-full"
          />
          <div>
            <label htmlFor="users-role-filter" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("users.role")}</label>
            <select
              id="users-role-filter"
              className="input"
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
            >
              <option value="">{t("users.allRoles")}</option>
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="viewer">{t("users.viewer")}</option>
              <option value="super_admin">{t("users.superAdmin")}</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState title={t("users.noUsersFound")} description={t("users.adjustFiltersOrCreateUser")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("users.email")}</th>
                  <th>{t("users.role")}</th>
                  <th>{t("users.joined")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td><span className="badge gray">{roleLabel(user.role)}</span></td>
                    <td className="text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.createUser")}</div>
        <div className="spacer-sm" />
        <form onSubmit={handleCreateUser} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("users.emailAddress")}
            type="email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            required
            placeholder={t("users.emailPlaceholder")}
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={createPassword}
            onChange={(event) => setCreatePassword(event.target.value)}
            required
            placeholder="********"
            minLength={6}
          />
          <div>
            <label htmlFor="create-org-user-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {t("users.role")}
            </label>
            <select
              id="create-org-user-role"
              className="input"
              value={createRole}
              onChange={(event) => setCreateRole(event.target.value)}
            >
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="viewer">{t("users.viewer")}</option>
            </select>
          </div>
          <div className="row-wrap">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setCreateEmail("");
                setCreatePassword("");
                setCreateRole("viewer");
              }}
            >
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" type="submit" disabled={creating}>
              {creating ? t("users.creating") : t("users.createUser")}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.inviteUserToProject")}</div>
        <div className="spacer-sm" />
        {sites.length === 0 ? (
          <EmptyState title={t("users.noProjectsAvailable")} description={t("users.createProjectFirstThenSendInvites")} />
        ) : (
          <form onSubmit={handleInvite} className="space-y-3" style={{ maxWidth: 520 }}>
            <div>
              <label htmlFor="invite-site" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("users.project")}</label>
              <select
                id="invite-site"
                className="input"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                required
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.slug})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("users.emailAddress")}
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
              placeholder={t("users.emailPlaceholder")}
            />
            <div>
              <label htmlFor="invite-org-user-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                {t("users.role")}
              </label>
              <select
                id="invite-org-user-role"
                className="input"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              >
                <option value="org_admin">{t("users.admin")}</option>
                <option value="editor">{t("users.editor")}</option>
                <option value="viewer">{t("users.viewer")}</option>
              </select>
            </div>
            <div className="row-wrap">
              <button className="btn btn-primary" type="submit" disabled={sendingInvite || !selectedSiteId}>
                {sendingInvite ? t("users.sending") : t("users.sendInvite")}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.pendingInvites")}</div>
        <div className="detail-label mt-1.5">
          {selectedSite
            ? t("users.projectDetails", { name: selectedSite.name, slug: selectedSite.slug })
            : t("users.selectProjectToListInvites")}
        </div>
        <div className="spacer-sm" />

        {!selectedSiteId ? (
          <div className="text-muted">{t("users.noProjectSelected")}</div>
        ) : loadingInvites ? (
          <div className="py-6">
            <Skeleton variant="text" width={200} height={22} className="mb-3" />
            <Skeleton variant="rectangular" width="100%" height={160} />
          </div>
        ) : (
          <>
            <Input
              label={t("users.searchInvites")}
              placeholder={t("users.searchByEmail")}
              value={inviteQuery}
              onChange={(event) => setInviteQuery(event.target.value)}
              className="w-full"
            />
            <div className="spacer-sm" />
            {filteredInvites.length === 0 ? (
              <EmptyState title={t("users.noPendingInvites")} description={t("users.invitesWillAppearAfterSending")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("users.email")}</th>
                      <th>{t("users.role")}</th>
                      <th>{t("users.sent")}</th>
                      <th>{t("users.expires")}</th>
                      <th className="text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.email}</td>
                        <td><span className="badge gray">{roleLabel(invite.role)}</span></td>
                        <td className="text-muted">{new Date(invite.createdAt).toLocaleDateString()}</td>
                        <td className="text-muted">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                        <td className="text-right">
                          <button className="btn" onClick={() => handleRevokeInvite(invite.id)}>{t("users.revoke")}</button>
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
    </div>
  );
}
