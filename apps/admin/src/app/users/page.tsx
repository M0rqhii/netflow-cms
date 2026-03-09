"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input, EmptyState, Skeleton } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import {
  fetchPlatformUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  type PlatformUser,
} from "@/lib/api";

type UpdatePayload = Parameters<typeof updatePlatformUser>[1];

/* ─── Role Configuration ─── */

const SYSTEM_ROLES = ["super_admin", "system_admin", "system_dev", "system_support"] as const;
const SITE_ROLES = ["viewer", "editor", "editor-in-chief", "marketing", "admin", "owner"] as const;
const PLATFORM_ROLES = ["user", "editor-in-chief", "admin", "owner", "platform_admin"] as const;

const ROLE_BADGE_COLORS: Record<string, string> = {
  super_admin: "red",
  system_admin: "orange",
  system_dev: "blue",
  system_support: "gray",
  owner: "green",
  admin: "blue",
  "platform_admin": "orange",
  "editor-in-chief": "blue",
  editor: "gray",
  marketing: "gray",
  viewer: "gray",
  user: "gray",
};

function roleBadgeColor(role: string | undefined): string {
  if (!role) return "gray";
  return ROLE_BADGE_COLORS[role] || "gray";
}

function formatRoleName(role: string): string {
  return role
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isSystemUser(u: PlatformUser): boolean {
  return (
    !!u.isSuperAdmin ||
    SYSTEM_ROLES.includes((u.systemRole || "") as typeof SYSTEM_ROLES[number]) ||
    u.role === "super_admin"
  );
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

/* ─── Page ─── */

export default function PlatformUsersPage() {
  const t = useTranslations();
  const toast = useToast();

  // Data
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "system" | "org">("all");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createSystemRole, setCreateSystemRole] = useState("");
  const [createSiteRole, setCreateSiteRole] = useState("viewer");
  const [createPlatformRole, setCreatePlatformRole] = useState("user");
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<PlatformUser | null>(null);
  const [editSiteRole, setEditSiteRole] = useState("");
  const [editPlatformRole, setEditPlatformRole] = useState("");
  const [editSystemRole, setEditSystemRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ─── Data Loading ─── */

  const loadUsers = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const result = await fetchPlatformUsers(page, pagination.pageSize);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToLoadUsers");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* ─── Filtered Users ─── */

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchQuery ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.organization?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "system" && isSystemUser(u)) ||
        (roleFilter === "org" && !isSystemUser(u));
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const systemCount = useMemo(() => users.filter(isSystemUser).length, [users]);
  const orgCount = useMemo(() => users.filter((u) => !isSystemUser(u)).length, [users]);

  /* ─── Handlers ─── */

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) return;
    setCreating(true);
    try {
      await createPlatformUser({
        email: createEmail,
        password: createPassword,
        role: createSystemRole || createSiteRole,
        platformRole: createPlatformRole === "user" ? undefined : createPlatformRole,
      });
      toast.push({ tone: "success", message: `${t("platformUsers.userCreatedSuccessfully") || "User created"}: ${createEmail}` });
      resetCreateForm();
      setShowCreateModal(false);
      await loadUsers();
    } catch (err) {
      toast.push({ tone: "error", message: err instanceof Error ? err.message : t("platformUsers.failedToCreateUser") });
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateSystemRole("");
    setCreateSiteRole("viewer");
    setCreatePlatformRole("user");
  };

  const openEditModal = (user: PlatformUser) => {
    setEditUser(user);
    setEditSiteRole(user.siteRole || "viewer");
    setEditPlatformRole(user.platformRole || "user");
    setEditSystemRole(user.systemRole || "");
  };

  const onUpdateUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const isSys = isSystemUser(editUser);
      const payload: UpdatePayload = {};

      if (isSys) {
        if (editSystemRole) {
          payload.systemRole = editSystemRole;
          payload.role = editSystemRole;
        }
      } else {
        if (editSiteRole) payload.siteRole = editSiteRole;
        if (editPlatformRole && editPlatformRole !== "user") payload.platformRole = editPlatformRole;
      }

      await updatePlatformUser(editUser.id, payload);
      toast.push({ tone: "success", message: t("platformUsers.userUpdatedSuccessfully") });
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      toast.push({ tone: "error", message: err instanceof Error ? err.message : t("platformUsers.failedToUpdateUser") });
    } finally {
      setSaving(false);
    }
  };

  const onDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlatformUser(deleteTarget.id);
      toast.push({ tone: "success", message: t("platformUsers.userDeletedSuccessfully") });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      toast.push({ tone: "error", message: err instanceof Error ? err.message : t("platformUsers.failedToDeleteUser") });
    } finally {
      setDeleting(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  /* ─── Render ─── */

  return (
    <div className="w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="card card-pad">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="view-title">{t("platformUsers.title")}</div>
            <div className="view-sub">{t("platformUsers.description")}</div>
          </div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("platformUsers.createNewUser")}
          </Button>
        </div>
      </div>

      <div className="spacer" />

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <button
          className={`card card-pad tight text-left transition-all ${roleFilter === "all" ? "ring-1 ring-[rgba(0,163,255,0.4)]" : "hover:ring-1 hover:ring-[rgba(255,255,255,0.1)]"}`}
          onClick={() => setRoleFilter("all")}
        >
          <div className="detail-label">{t("platformUsers.totalUsers")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{pagination.total}</div>
        </button>
        <button
          className={`card card-pad tight text-left transition-all ${roleFilter === "system" ? "ring-1 ring-[rgba(255,176,66,0.4)]" : "hover:ring-1 hover:ring-[rgba(255,255,255,0.1)]"}`}
          onClick={() => setRoleFilter("system")}
        >
          <div className="detail-label">{t("platformUsers.systemAdministrators")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{systemCount}</div>
        </button>
        <button
          className={`card card-pad tight text-left transition-all ${roleFilter === "org" ? "ring-1 ring-[rgba(0,229,188,0.4)]" : "hover:ring-1 hover:ring-[rgba(255,255,255,0.1)]"}`}
          onClick={() => setRoleFilter("org")}
        >
          <div className="detail-label">{t("platformUsers.organizationUsers")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{orgCount}</div>
        </button>
      </div>

      <div className="spacer" />

      {/* Search */}
      <div className="card card-pad">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder={t("platformUsers.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {roleFilter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setRoleFilter("all")}>
              {t("platformUsers.clearFilter")}
            </Button>
          )}
        </div>
      </div>

      <div className="spacer" />

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="card card-pad">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card card-pad">
          <EmptyState
            title={searchQuery ? t("platformUsers.noSearchResults") : t("platformUsers.noUsersFound")}
            description={searchQuery ? t("platformUsers.tryDifferentSearch") : undefined}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="pl-5">{t("platformUsers.user")}</th>
                  <th>{t("platformUsers.roles")}</th>
                  <th>{t("platformUsers.organization")}</th>
                  <th>{t("platformUsers.created")}</th>
                  <th className="text-right pr-5">{t("platformUsers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSys = isSystemUser(u);
                  const expanded = expandedId === u.id;
                  const primaryRole = isSys
                    ? (u.systemRole || u.role || "")
                    : (u.siteRole || u.role || "viewer");
                  const secondaryRole = !isSys ? (u.platformRole || "user") : undefined;

                  return (
                    <tr
                      key={u.id}
                      className={`group cursor-pointer transition-colors ${expanded ? "bg-surface/50" : "hover:bg-surface/30"}`}
                      onClick={() => setExpandedId(expanded ? null : u.id)}
                    >
                      {/* User */}
                      <td className="pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              isSys
                                ? "bg-orange-500/15 text-orange-400"
                                : "bg-blue-500/15 text-blue-400"
                            }`}
                          >
                            {userInitials(u.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{u.email}</div>
                            {expanded && (
                              <div className="text-[11px] text-muted font-mono mt-0.5 truncate">{u.id}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`badge ${roleBadgeColor(primaryRole)}`}>
                            {formatRoleName(primaryRole)}
                          </span>
                          {secondaryRole && secondaryRole !== "user" && (
                            <span className={`badge ${roleBadgeColor(secondaryRole)}`}>
                              {formatRoleName(secondaryRole)}
                            </span>
                          )}
                          {u.isSuperAdmin && primaryRole !== "super_admin" && (
                            <span className="badge red">Super Admin</span>
                          )}
                        </div>
                      </td>

                      {/* Organization */}
                      <td>
                        <span className="text-sm text-muted">
                          {u.organization?.name || u.organization?.slug || "-"}
                        </span>
                      </td>

                      {/* Created */}
                      <td>
                        <div className="text-sm text-muted" title={new Date(u.createdAt).toLocaleString()}>
                          {timeAgo(u.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(u)}
                            aria-label={`${t("common.edit")} ${u.email}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(u)}
                            aria-label={`${t("common.delete")} ${u.email}`}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
              <div className="text-xs text-muted">
                {t("platformUsers.showing")} {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t("platformUsers.of")} {pagination.total}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  {t("common.previous")}
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                        pageNum === pagination.page
                          ? "bg-[rgba(0,163,255,0.15)] text-[rgb(0,163,255)]"
                          : "text-muted hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Create User Modal ─── */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); resetCreateForm(); }} title={t("platformUsers.createNewUser")} size="md">
        <form onSubmit={onCreateUser} className="space-y-4">
          <Input
            label={t("platformUsers.email")}
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
            placeholder="user@example.com"
          />
          <Input
            label={t("platformUsers.password")}
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            required
            placeholder="Min. 8 characters"
            minLength={8}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
              {t("platformUsers.userType")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`card card-pad tight text-left text-sm transition-all ${
                  !createSystemRole
                    ? "ring-1 ring-[rgba(0,163,255,0.4)]"
                    : "opacity-60 hover:opacity-80"
                }`}
                onClick={() => setCreateSystemRole("")}
              >
                <div className="font-semibold text-xs">{t("platformUsers.orgUser")}</div>
                <div className="text-[11px] text-muted mt-0.5">{t("platformUsers.orgUserDesc")}</div>
              </button>
              <button
                type="button"
                className={`card card-pad tight text-left text-sm transition-all ${
                  createSystemRole
                    ? "ring-1 ring-[rgba(255,176,66,0.4)]"
                    : "opacity-60 hover:opacity-80"
                }`}
                onClick={() => setCreateSystemRole("system_admin")}
              >
                <div className="font-semibold text-xs">{t("platformUsers.systemUser")}</div>
                <div className="text-[11px] text-muted mt-0.5">{t("platformUsers.systemUserDesc")}</div>
              </button>
            </div>
          </div>

          {createSystemRole ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                {t("platformUsers.systemRole")}
              </label>
              <select className="input w-full" value={createSystemRole} onChange={(e) => setCreateSystemRole(e.target.value)}>
                {SYSTEM_ROLES.map((r) => (
                  <option key={r} value={r}>{formatRoleName(r)}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                  {t("platformUsers.siteRole")}
                </label>
                <select className="input w-full" value={createSiteRole} onChange={(e) => setCreateSiteRole(e.target.value)}>
                  {SITE_ROLES.map((r) => (
                    <option key={r} value={r}>{formatRoleName(r)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                  {t("platformUsers.platformRole")}
                </label>
                <select className="input w-full" value={createPlatformRole} onChange={(e) => setCreatePlatformRole(e.target.value)}>
                  {PLATFORM_ROLES.map((r) => (
                    <option key={r} value={r}>{formatRoleName(r)}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} disabled={creating}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" type="submit" isLoading={creating}>
              {t("platformUsers.createNewUser")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit User Modal ─── */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`${t("platformUsers.editUser")} ${editUser?.email || ""}`}
        size="md"
      >
        {editUser && (
          <div className="space-y-4">
            {/* User info header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isSystemUser(editUser)
                    ? "bg-orange-500/15 text-orange-400"
                    : "bg-blue-500/15 text-blue-400"
                }`}
              >
                {userInitials(editUser.email)}
              </div>
              <div>
                <div className="text-sm font-medium">{editUser.email}</div>
                <div className="text-[11px] text-muted">
                  {editUser.organization?.name || "-"} &middot; {t("platformUsers.created")} {new Date(editUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {isSystemUser(editUser) ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                  {t("platformUsers.systemRole")}
                </label>
                <select className="input w-full" value={editSystemRole} onChange={(e) => setEditSystemRole(e.target.value)}>
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>{formatRoleName(r)}</option>
                  ))}
                </select>
                <div className="text-[11px] text-muted mt-1.5">{t("platformUsers.systemRoleHint")}</div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                    {t("platformUsers.siteRole")}
                  </label>
                  <select className="input w-full" value={editSiteRole} onChange={(e) => setEditSiteRole(e.target.value)}>
                    {SITE_ROLES.map((r) => (
                      <option key={r} value={r}>{formatRoleName(r)}</option>
                    ))}
                  </select>
                  <div className="text-[11px] text-muted mt-1.5">{t("platformUsers.siteRoleHint")}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
                    {t("platformUsers.platformRole")}
                  </label>
                  <select className="input w-full" value={editPlatformRole} onChange={(e) => setEditPlatformRole(e.target.value)}>
                    {PLATFORM_ROLES.map((r) => (
                      <option key={r} value={r}>{formatRoleName(r)}</option>
                    ))}
                  </select>
                  <div className="text-[11px] text-muted mt-1.5">{t("platformUsers.platformRoleHint")}</div>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={onUpdateUser} isLoading={saving}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteUser}
        title={t("platformUsers.deleteUserTitle")}
        message={`${t("platformUsers.deleteUserMessage")} ${deleteTarget?.email || ""}?`}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
