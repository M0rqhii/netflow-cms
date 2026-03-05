"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input, EmptyState, Skeleton } from "@repo/ui";
import { fetchSiteUsers, fetchMySites, createUser, updateUserRole, fetchSiteInvites, inviteUserToSite, revokeInvite } from "@/lib/api";
import type { UserSummary, InviteSummary } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";

export default function SiteUsersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [role, setRole] = useState("editor");
  const [inviteRole, setInviteRole] = useState("editor");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const toast = useToast();

  const normalizeRole = (value: string) => (value === "site_admin" ? "org_admin" : value);
  const roleLabel = (value: string) => {
    const normalized = normalizeRole(value);
    switch (normalized) {
      case "org_admin":
        return t("users.admin");
      case "super_admin":
        return t("users.superAdmin");
      case "editor":
        return t("users.editor");
      case "viewer":
        return t("users.viewer");
      default:
        return normalized;
    }
  };

  useEffect(() => {
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const sites = await fetchMySites();
        const site = sites.find((s: SiteInfo) => s.site.slug === slug);

        if (!site) {
          throw new Error(`Site with slug "${slug}" not found`);
        }

        const id = site.siteId;
        setSiteId(id);

        const [usersData, invitesData] = await Promise.all([
          fetchSiteUsers(id),
          fetchSiteInvites(id),
        ]);

        setUsers(usersData);
        setInvites(invitesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("users.failedToLoadUsers");
        toast.push({ tone: "error", message });
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, toast, t]);

  const refreshData = async () => {
    if (!siteId) return;

    try {
      const [usersData, invitesData] = await Promise.all([
        fetchSiteUsers(siteId),
        fetchSiteInvites(siteId),
      ]);
      setUsers(usersData);
      setInvites(invitesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("users.failedToRefreshData");
      toast.push({ tone: "error", message });
    }
  };

  const filteredUsers = users.filter((u) =>
    (!query || u.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || normalizeRole(u.role) === roleFilter)
  );

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !createEmail || !createPassword) return;

    try {
      setCreating(true);
      await createUser(siteId, { email: createEmail, password: createPassword, role, preferredLanguage: "en" });
      setCreateEmail("");
      setCreatePassword("");
      toast.push({ tone: "success", message: `${t("users.userCreatedSuccessfully")} ${createEmail}` });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("users.failedToCreateUser");
      toast.push({ tone: "error", message });
    } finally {
      setCreating(false);
    }
  };

  const onUpdateRole = async (userId: string, newRole: string) => {
    if (!siteId) return;

    try {
      await updateUserRole(siteId, userId, newRole);
      setEditingUserId(null);
      toast.push({ tone: "success", message: t("users.userRoleUpdatedSuccessfully") });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("users.failedToUpdateUserRole");
      toast.push({ tone: "error", message });
    }
  };

  const startEditRole = (user: UserSummary) => {
    setEditingUserId(user.id);
    setEditingRole(normalizeRole(user.role));
  };

  const cancelEditRole = () => {
    setEditingUserId(null);
    setEditingRole("");
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !inviteEmail) return;

    try {
      setSending(true);
      await inviteUserToSite(inviteEmail, inviteRole, siteId);
      setInviteEmail("");
      toast.push({ tone: "success", message: `${t("users.inviteSentTo")} ${inviteEmail}` });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("users.failedToSendInvite");
      toast.push({ tone: "error", message });
    } finally {
      setSending(false);
    }
  };

  const onRevokeInvite = async (inviteId: string) => {
    if (!siteId) return;

    try {
      await revokeInvite(siteId, inviteId);
      toast.push({ tone: "success", message: t("users.inviteRevoked") });
      await refreshData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("users.failedToRevokeInvite");
      toast.push({ tone: "error", message });
    }
  };

  const filteredInvites = invites.filter((iv) =>
    (!query || iv.email.toLowerCase().includes(query.toLowerCase())) &&
    (!roleFilter || normalizeRole(iv.role) === roleFilter)
  );

  return (
    <div>
      <div className="card card-pad">
        <div className="row-start" style={{ flexWrap: "wrap" }}>
          <div>
            <div className="view-title">{t("users.title")}</div>
            <div className="view-sub">{t("users.manageUsersAndInvites")} {slug}</div>
          </div>
          <Link href={`/sites/${encodeURIComponent(slug)}`} className="btn">{t("common.back")}</Link>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.members")}</div>
        <div className="spacer-sm" />
        {loading ? (
          <div className="py-8">
            <Skeleton variant="text" width={200} height={24} className="mb-4" />
            <Skeleton variant="rectangular" width="100%" height={200} />
          </div>
        ) : (
          <>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <Input
                label={t("common.search")}
                placeholder={t("users.searchByEmail")}
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                className="w-full"
              />
              <div>
                <label htmlFor="role-filter" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("users.filterByRole")}</label>
                <select
                  id="role-filter"
                  className="input"
                  value={roleFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                >
                  <option value="">{t("users.allRoles")}</option>
                  <option value="org_admin">{t("users.admin")}</option>
                  <option value="editor">{t("users.editor")}</option>
                  <option value="viewer">{t("users.viewer")}</option>
                </select>
              </div>
            </div>
            {filteredUsers.length === 0 ? (
              <EmptyState title={t("users.noUsersFound")} description={query || roleFilter ? t("users.tryAdjustingSearch") : t("users.noUsersAddedYet")} />
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
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          {editingUserId === u.id ? (
                            <div className="row-wrap">
                              <select
                                className="input"
                                value={editingRole}
                                onChange={(e) => setEditingRole(e.target.value)}
                              >
                                <option value="super_admin">{t("users.superAdmin")}</option>
                                <option value="org_admin">{t("users.admin")}</option>
                                <option value="editor">{t("users.editor")}</option>
                                <option value="viewer">{t("users.viewer")}</option>
                              </select>
                              <button className="btn btn-primary" onClick={() => onUpdateRole(u.id, editingRole)}>{t("common.save")}</button>
                              <button className="btn" onClick={cancelEditRole}>{t("common.cancel")}</button>
                            </div>
                          ) : (
                            <div className="row-wrap">
                              <span className="badge gray">{roleLabel(u.role)}</span>
                              <button className="btn" onClick={() => startEditRole(u)}>{t("users.changeRole")}</button>
                            </div>
                          )}
                        </td>
                        <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.createUser")}</div>
        <div className="spacer-sm" />
        <form onSubmit={onCreateUser} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("users.emailAddress")}
            type="email"
            value={createEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateEmail(e.target.value)}
            required
            placeholder={t("users.emailPlaceholder")}
            helperText={t("users.emailHelperText")}
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={createPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatePassword(e.target.value)}
            required
            placeholder="********"
            helperText={t("users.passwordHelperText")}
            minLength={6}
          />
          <div>
            <label htmlFor="create-user-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {t("users.role")}
            </label>
            <select
              id="create-user-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="viewer">{t("users.viewer")}</option>
            </select>
          </div>
          <div className="row-wrap">
            <button className="btn" type="button" onClick={() => {
              setCreateEmail("");
              setCreatePassword("");
            }}>{t("common.cancel")}</button>
            <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? t("users.creating") : t("users.createUser")}</button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.inviteUser")}</div>
        <div className="spacer-sm" />
        <form onSubmit={onInvite} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("users.emailAddress")}
            type="email"
            value={inviteEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
            required
            placeholder={t("users.emailPlaceholder")}
            helperText={t("users.inviteEmailHelperText")}
          />
          <div>
            <label htmlFor="invite-user-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {t("users.role")}
            </label>
            <select
              id="invite-user-role"
              className="input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              required
            >
              <option value="org_admin">{t("users.admin")}</option>
              <option value="editor">{t("users.editor")}</option>
              <option value="viewer">{t("users.viewer")}</option>
            </select>
          </div>
          <div className="row-wrap">
            <button className="btn btn-primary" type="submit" disabled={sending}>{sending ? t("users.sending") : t("users.sendInvite")}</button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("users.pendingInvites")}</div>
        <div className="spacer-sm" />
        {loading ? (
          <div className="py-6">
            <Skeleton variant="text" width={180} height={20} className="mb-3" />
            <Skeleton variant="rectangular" width="100%" height={160} />
          </div>
        ) : filteredInvites.length === 0 ? (
          <EmptyState title={t("users.noPendingInvites")} description={t("users.invitesWillAppear")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("users.email")}</th>
                  <th>{t("users.role")}</th>
                  <th>{t("users.sent")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.email}</td>
                    <td><span className="badge gray">{roleLabel(invite.role)}</span></td>
                    <td className="text-muted">{new Date(invite.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn" onClick={() => onRevokeInvite(invite.id)}>{t("users.revoke")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

