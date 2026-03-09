"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyState, Input, Skeleton } from "@repo/ui";
import {
  createOrgUser,
  fetchOrgDashboard,
  fetchOrgUsers,
  fetchOrgInvites,
  fetchSiteInvites,
  inviteUserToOrg,
  revokeOrgInvite,
  type DashboardSiteCard,
  type InviteSummary,
  type UserSummary,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslations } from "@/hooks/useTranslations";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";

/* ─── Helpers ─── */

function normalizeRole(value: string): string {
  return value === "site_admin" ? "org_admin" : value;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  super_admin: "red",
  org_admin: "orange",
  admin: "blue",
  "editor-in-chief": "blue",
  editor: "gray",
  marketing: "gray",
  viewer: "gray",
  owner: "green",
};

function roleBadgeColor(role: string): string {
  return ROLE_BADGE_COLORS[normalizeRole(role)] || "gray";
}

function userInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function daysUntil(dateStr: string): { text: string; urgent: boolean } {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: "Expired", urgent: true };
  if (days === 0) return { text: "Today", urgent: true };
  if (days === 1) return { text: "Tomorrow", urgent: true };
  if (days <= 3) return { text: `${days}d`, urgent: true };
  return { text: `${days}d`, urgent: false };
}

const INVITE_STATUS_COLORS: Record<string, string> = {
  pending: "orange",
  accepted: "green",
  revoked: "gray",
  expired: "red",
};

/* ─── Page ─── */

export default function OrgUsersPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();
  const { language } = useLanguage();
  const t = useTranslations();

  const roleLabel = (value: string) => {
    const normalized = normalizeRole(value);
    const labels: Record<string, string> = {
      org_admin: t("users.admin"),
      admin: t("users.admin"),
      super_admin: t("users.superAdmin"),
      "editor-in-chief": t("users.editorInChief"),
      editor: t("users.editor"),
      marketing: t("users.marketing"),
      viewer: t("users.viewer"),
      owner: t("users.owner"),
    };
    return labels[normalized] || normalized;
  };

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sites, setSites] = useState<DashboardSiteCard[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  // User filters
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  // Create user
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("viewer");
  const [creating, setCreating] = useState(false);

  // Invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteSiteId, setInviteSiteId] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Invites list
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<InviteSummary | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"users" | "invites">("users");

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [sites, selectedSiteId]
  );

  /* ─── Data Loading ─── */

  const loadBaseData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [usersData, dashboardData] = await Promise.all([fetchOrgUsers(orgId), fetchOrgDashboard(orgId)]);
      const nextSites = dashboardData?.sites ?? [];
      setUsers(usersData);
      setSites(nextSites);
      setSelectedSiteId((current) => {
        if (current && nextSites.some((s) => s.id === current)) return current;
        return nextSites[0]?.id ?? "";
      });
    } catch (err) {
      setError(toFriendlyMessage(err, t("users.failedToLoadOrganizationUsers")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  const loadInvites = useCallback(
    async () => {
      if (!orgId) { setInvites([]); return; }
      setLoadingInvites(true);
      try {
        // Load all org invites (site-specific + org-level)
        setInvites(await fetchOrgInvites(orgId));
      } catch {
        // Fallback to site-specific if org-level fails
        if (selectedSiteId) {
          try {
            setInvites(await fetchSiteInvites(selectedSiteId));
          } catch (err) {
            push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToLoadInvites")) });
          }
        }
      } finally {
        setLoadingInvites(false);
      }
    },
    [orgId, selectedSiteId, push, t]
  );

  useEffect(() => { if (orgId) loadBaseData(); }, [loadBaseData, orgId]);
  useEffect(() => { loadInvites(); }, [loadInvites]);

  /* ─── Filtered Data ─── */

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !userQuery || u.email.toLowerCase().includes(userQuery.toLowerCase());
      const matchesRole = !userRoleFilter || normalizeRole(u.role) === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userQuery, userRoleFilter]);

  // Filter for invites tab: "all" shows everything, a siteId filters, "org" shows org-level only
  const [inviteSiteFilter, setInviteSiteFilter] = useState<string>("all");

  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      const matchesSearch = !inviteQuery || inv.email.toLowerCase().includes(inviteQuery.toLowerCase());
      const matchesSite =
        inviteSiteFilter === "all" ||
        (inviteSiteFilter === "org" ? !inv.siteId : inv.siteId === inviteSiteFilter);
      return matchesSearch && matchesSite;
    });
  }, [invites, inviteQuery, inviteSiteFilter]);

  const pendingCount = useMemo(() => invites.filter((i) => i.status === "pending").length, [invites]);

  /* ─── Handlers ─── */

  // Create user state - optional site assignment
  const [createSiteId, setCreateSiteId] = useState("");

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgId || !createEmail.trim()) return;
    setCreating(true);
    try {
      await createOrgUser(orgId, {
        email: createEmail.trim().toLowerCase(),
        password: createPassword.trim() ? createPassword : undefined,
        role: createRole,
        preferredLanguage: language,
        siteId: createSiteId || undefined,
      });
      push({ tone: "success", message: `${t("users.userCreatedSuccessfully")}: ${createEmail}` });
      setCreateEmail(""); setCreatePassword(""); setCreateRole("viewer"); setCreateSiteId("");
      setShowCreateModal(false);
      setUsers(await fetchOrgUsers(orgId));
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToCreateUser")) });
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgId || !inviteEmail.trim()) return;
    const resolvedSiteId = inviteSiteId || undefined;
    setSendingInvite(true);
    try {
      await inviteUserToOrg(orgId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        siteId: resolvedSiteId,
      });
      push({ tone: "success", message: `${t("users.inviteSentTo")} ${inviteEmail}` });
      setInviteEmail(""); setInviteRole("viewer"); setInviteSiteId("");
      setShowInviteModal(false);
      await loadInvites();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToSendInvite")) });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!revokeTarget || !orgId) return;
    setRevoking(true);
    try {
      await revokeOrgInvite(orgId, revokeTarget.id);
      push({ tone: "success", message: t("users.inviteRevoked") });
      setRevokeTarget(null);
      await loadInvites();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("users.failedToRevokeInvite")) });
    } finally {
      setRevoking(false);
    }
  };

  /* ─── Loading / Error ─── */

  if (loading) {
    return (
      <div className="animate-fade-in org-settings-page">
        <div className="card card-pad">
          <Skeleton variant="text" width={220} height={28} className="mb-2" />
          <Skeleton variant="text" width={340} height={16} />
        </div>
        <div className="spacer" />
        <div className="card card-pad">
          <Skeleton variant="rectangular" width="100%" height={280} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in org-settings-page">
        <div className="card card-pad">
          <div className="text-error">{error}</div>
          <div className="spacer-sm" />
          <Button variant="outline" onClick={loadBaseData}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }

  /* ─── Render ─── */

  return (
    <div className="animate-fade-in org-settings-page">
      {/* Header */}
      <div className="card card-pad">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="section-title">{t("users.title")}</div>
            <div className="detail-label mt-1">{t("users.manageOrganizationUsersAndInvites")}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setInviteSiteId(selectedSiteId); setShowInviteModal(true); }} disabled={sites.length === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5" aria-hidden="true">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              {t("users.sendInvite")}
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t("users.createUser")}
            </Button>
          </div>
        </div>
      </div>

      <div className="spacer" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card card-pad tight">
          <div className="detail-label">{t("users.members")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{users.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("users.pendingInvites")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{pendingCount}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("users.project")}</div>
          <div className="text-sm font-bold leading-tight mt-1 truncate">{selectedSite?.name || "-"}</div>
        </div>
      </div>

      <div className="spacer" />

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-surface/50 w-fit">
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "users"
              ? "bg-[rgba(0,163,255,0.12)] text-[rgb(0,163,255)]"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setActiveTab("users")}
        >
          {t("users.organizationUsers")} ({users.length})
        </button>
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "invites"
              ? "bg-[rgba(255,176,66,0.12)] text-[rgb(255,176,66)]"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setActiveTab("invites")}
        >
          {t("users.pendingInvites")} ({pendingCount})
        </button>
      </div>

      <div className="spacer" />

      {/* ─── Users Tab ─── */}
      {activeTab === "users" && (
        <>
          {/* Search & Filter */}
          <div className="card card-pad">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder={t("users.searchByEmail")}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="input h-[38px]"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">{t("users.allRoles")}</option>
                  <option value="super_admin">{t("users.superAdmin")}</option>
                  <option value="org_admin">{t("users.admin")}</option>
                  <option value="editor-in-chief">{t("users.editorInChief")}</option>
                  <option value="editor">{t("users.editor")}</option>
                  <option value="marketing">{t("users.marketing")}</option>
                  <option value="viewer">{t("users.viewer")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="spacer" />

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <div className="card card-pad">
              <EmptyState
                title={t("users.noUsersFound")}
                description={userQuery || userRoleFilter ? t("users.adjustFiltersOrCreateUser") : undefined}
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="pl-5">{t("users.email")}</th>
                      <th>{t("users.role")}</th>
                      <th>{t("users.joined")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="group">
                        <td className="pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {userInitials(user.email)}
                            </div>
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${roleBadgeColor(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-muted" title={new Date(user.createdAt).toLocaleString()}>
                            {timeAgo(user.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Invites Tab ─── */}
      {activeTab === "invites" && (
        <>
          {/* Filter + search */}
          <div className="card card-pad">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-56">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                  {t("users.scope")}
                </label>
                <select
                  className="input w-full"
                  value={inviteSiteFilter}
                  onChange={(e) => setInviteSiteFilter(e.target.value)}
                >
                  <option value="all">{t("users.allInvites")}</option>
                  <option value="org">{t("users.orgLevelOnly")}</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                  {t("users.searchInvites")}
                </label>
                <Input
                  placeholder={t("users.searchByEmail")}
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="spacer" />

          {/* Invites Table */}
          {loadingInvites ? (
            <div className="card card-pad">
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="card card-pad">
              <EmptyState
                title={t("users.noPendingInvites")}
                description={t("users.invitesWillAppearAfterSending")}
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="pl-5">{t("users.email")}</th>
                      <th>{t("users.role")}</th>
                      <th>{t("users.scope")}</th>
                      <th>{t("users.status")}</th>
                      <th>{t("users.expires")}</th>
                      <th className="text-right pr-5">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvites.map((invite) => {
                      const expiry = daysUntil(invite.expiresAt);
                      const statusColor = INVITE_STATUS_COLORS[invite.status] || "gray";
                      return (
                        <tr key={invite.id} className="group">
                          <td className="pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {userInitials(invite.email)}
                              </div>
                              <span className="text-sm">{invite.email}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${roleBadgeColor(invite.role)}`}>
                              {roleLabel(invite.role)}
                            </span>
                          </td>
                          <td>
                            {invite.site ? (
                              <span className="badge blue">{invite.site.name}</span>
                            ) : (
                              <span className="badge green">{t("users.organization")}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${statusColor}`}>
                              {invite.status}
                            </span>
                          </td>
                          <td>
                            <span className={`text-sm ${expiry.urgent ? "text-orange-400 font-medium" : "text-muted"}`} title={new Date(invite.expiresAt).toLocaleString()}>
                              {expiry.text}
                            </span>
                          </td>
                          <td className="text-right pr-5">
                            {invite.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeTarget(invite)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                {t("users.revoke")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Create User Modal ─── */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("users.createUser")}
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label={t("users.emailAddress")}
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
            placeholder={t("users.emailPlaceholder")}
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="********"
            minLength={8}
            helperText={t("users.passwordOptionalHelper")}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
              {t("users.role")}
            </label>
            <select className="input w-full" value={createRole} onChange={(e) => setCreateRole(e.target.value)}>
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor-in-chief">{t("users.editorInChief")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="marketing">{t("users.marketing")}</option>
              <option value="viewer">{t("users.viewer")}</option>
            </select>
          </div>
          {sites.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                {t("users.assignToSite")}
              </label>
              <select className="input w-full" value={createSiteId} onChange={(e) => setCreateSiteId(e.target.value)}>
                <option value="">{t("users.orgLevelOnly")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.slug})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-muted mt-1">{t("users.assignToSiteHint")}</div>
            </div>
          )}
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)} disabled={creating}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" type="submit" isLoading={creating}>
              {t("users.createUser")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Invite Modal ─── */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={t("users.inviteUser")}
        size="md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label={t("users.emailAddress")}
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            placeholder={t("users.emailPlaceholder")}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
              {t("users.role")}
            </label>
            <select className="input w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor-in-chief">{t("users.editorInChief")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="marketing">{t("users.marketing")}</option>
              <option value="viewer">{t("users.viewer")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
              {t("users.assignToSite")}
            </label>
            <select className="input w-full" value={inviteSiteId} onChange={(e) => setInviteSiteId(e.target.value)}>
              <option value="">{t("users.orgLevelOnly")}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.slug})
                </option>
              ))}
            </select>
            <div className="text-[11px] text-muted mt-1">{t("users.inviteScopeHint")}</div>
          </div>
          <div className="flex items-center gap-3 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setShowInviteModal(false)} disabled={sendingInvite}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" type="submit" isLoading={sendingInvite}>
              {t("users.sendInvite")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Revoke Confirm ─── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeInvite}
        title={t("users.revokeInviteTitle")}
        message={`${t("users.revokeInviteMessage")} ${revokeTarget?.email || ""}?`}
        confirmLabel={t("users.revoke")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={revoking}
      />
    </div>
  );
}
