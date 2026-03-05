"use client";

import { useState, useEffect, useMemo } from "react";
import { Input, EmptyState, Skeleton } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import {
  fetchPlatformUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
  type PlatformUser,
} from "@/lib/api";

type UpdatePayload = Parameters<typeof updatePlatformUser>[1];

const mapOldRoleToSiteRole = (role: string | undefined): string => {
  if (!role) return "viewer";
  const mapping: Record<string, string> = {
    super_admin: "owner",
    org_admin: "admin",
    site_admin: "admin",
    editor: "editor",
    viewer: "viewer",
  };
  return mapping[role] || role;
};

const mapOldRoleToSystemRole = (role: string | undefined): string | undefined => {
  if (!role) return undefined;
  if (role === "super_admin") return "super_admin";
  return undefined;
};

const formatRoleName = (role: string): string => {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function PlatformUsersPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [platformRole, setPlatformRole] = useState("user");
  const [systemRole, setSystemRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [editRole, setEditRole] = useState("");
  const [editSiteRole, setEditSiteRole] = useState("");
  const [editPlatformRole, setEditPlatformRole] = useState("");
  const [editSystemRole, setEditSystemRole] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await fetchPlatformUsers(pagination.page, pagination.pageSize);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToLoadUsers");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const systemUsers = useMemo(() => {
    return users.filter((u) =>
      u.isSuperAdmin ||
      u.systemRole === "super_admin" ||
      u.systemRole === "system_admin" ||
      u.systemRole === "system_dev" ||
      u.systemRole === "system_support" ||
      u.role === "super_admin"
    );
  }, [users]);

  const organizationUsers = useMemo(() => {
    return users.filter((u) =>
      !u.isSuperAdmin &&
      !["super_admin", "system_admin", "system_dev", "system_support"].includes(u.systemRole || "") &&
      u.role !== "super_admin"
    );
  }, [users]);

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await createPlatformUser({
        email,
        password,
        role: systemRole || role,
        platformRole: platformRole === "user" ? undefined : platformRole,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : undefined,
      });
      setEmail("");
      setPassword("");
      setRole("viewer");
      setPlatformRole("user");
      setSystemRole("");
      setSelectedPermissions([]);
      setShowCreateForm(false);
      toast.push({ tone: "success", message: `${email} ${t("users.userCreatedSuccessfully")}` });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToCreateUser");
      toast.push({ tone: "error", message });
    }
  };

  const onUpdateUser = async (userId: string) => {
    try {
      const isSystemUser = systemUsers.some((u) => u.id === userId);
      const mappedSiteRole = !isSystemUser ? mapOldRoleToSiteRole(editSiteRole) : undefined;
      const mappedSystemRole = isSystemUser ? (editSystemRole || mapOldRoleToSystemRole(editRole)) : undefined;

      const updatePayload: UpdatePayload = {};
      if (editPlatformRole && editPlatformRole !== "user") {
        updatePayload.platformRole = editPlatformRole;
      }
      if (editPermissions.length > 0) {
        updatePayload.permissions = editPermissions;
      }

      if (isSystemUser) {
        if (mappedSystemRole) {
          updatePayload.systemRole = mappedSystemRole;
          updatePayload.role = mappedSystemRole;
        }
      } else {
        if (mappedSiteRole) {
          updatePayload.siteRole = mappedSiteRole;
          const oldRoleNames = ["site_admin", "super_admin"];
          if (!oldRoleNames.includes(editRole)) {
            updatePayload.role = editRole;
          }
        }
      }

      await updatePlatformUser(userId, updatePayload);
      setEditingUserId(null);
      toast.push({ tone: "success", message: t("platformUsers.userUpdatedSuccessfully") });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToUpdateUser");
      toast.push({ tone: "error", message });
    }
  };

  const onDeleteUser = async (userId: string) => {
    if (!confirm(t("platformUsers.areYouSureDeleteUser"))) return;

    try {
      await deletePlatformUser(userId);
      toast.push({ tone: "success", message: t("platformUsers.userDeletedSuccessfully") });
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToDeleteUser");
      toast.push({ tone: "error", message });
    }
  };

  const startEdit = (user: PlatformUser) => {
    setEditingUserId(user.id);
    const mappedSiteRole = user.siteRole || mapOldRoleToSiteRole(user.role) || "viewer";
    setEditRole(user.role || "viewer");
    setEditSiteRole(mappedSiteRole);
    setEditPlatformRole(user.platformRole || "user");
    setEditSystemRole(user.systemRole || mapOldRoleToSystemRole(user.role) || "");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditRole("");
    setEditSiteRole("");
    setEditPlatformRole("");
    setEditSystemRole("");
    setEditPermissions([]);
  };

  return (
    <div>
      <div className="card card-pad">
        <div className="view-title">Platform Users</div>
        <div className="view-sub">Manage system and organization users.</div>
        <div className="spacer-sm" />
        <div className="row-wrap">
          {!showCreateForm ? (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              {t("platformUsers.createNewUser")}
            </button>
          ) : (
            <button className="btn" onClick={() => setShowCreateForm(false)}>
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      <div className="spacer" />

      {loading && users.length === 0 ? (
        <div className="card card-pad">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {showCreateForm && (
            <div className="card card-pad">
              <div className="section-title">Create New Platform User</div>
              <div className="spacer-sm" />
              <form onSubmit={onCreateUser} className="space-y-3" style={{ maxWidth: 520 }}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Password</label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="system-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">System Role (optional)</label>
                  <select
                    id="system-role"
                    className="input"
                    value={systemRole}
                    onChange={(e) => setSystemRole(e.target.value)}
                  >
                    <option value="">None (Organization User)</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="system_admin">System Admin</option>
                    <option value="system_dev">System Dev</option>
                    <option value="system_support">System Support</option>
                  </select>
                </div>
                {!systemRole && (
                  <>
                    <div>
                      <label htmlFor="site-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Site Role</label>
                      <select id="site-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="editor-in-chief">Editor-in-Chief</option>
                        <option value="marketing">Marketing</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="platform-role" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Platform Role</label>
                      <select id="platform-role" className="input" value={platformRole} onChange={(e) => setPlatformRole(e.target.value)}>
                        <option value="user">User</option>
                        <option value="editor-in-chief">Editor-in-Chief</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                        <option value="platform_admin">Platform Admin</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn-primary" type="submit">Create User</button>
                  <button className="btn" type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {showCreateForm && <div className="spacer" />}

          <div className="card card-pad">
            <div className="section-title">{t("platformUsers.systemAdministrators")}</div>
            <div className="spacer-sm" />
            {systemUsers.length === 0 ? (
              <EmptyState title={t("platformUsers.noSystemAdministratorsFound")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("platformUsers.email")}</th>
                      <th>{t("platformUsers.systemRole")}</th>
                      <th>{t("platformUsers.organization")}</th>
                      <th>{t("platformUsers.created")}</th>
                      <th>{t("platformUsers.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          {editingUserId === u.id ? (
                            <select
                              className="input"
                              value={editSystemRole || (u.role === "super_admin" ? "super_admin" : "")}
                              onChange={(e) => setEditSystemRole(e.target.value)}
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="system_admin">System Admin</option>
                              <option value="system_dev">System Dev</option>
                              <option value="system_support">System Support</option>
                            </select>
                          ) : (
                            <span className={u.isSuperAdmin || u.systemRole === "super_admin" || u.role === "super_admin" ? "badge green" : "badge gray"}>
                              {formatRoleName(u.systemRole || mapOldRoleToSystemRole(u.role) || u.role || "")}
                            </span>
                          )}
                        </td>
                        <td className="text-muted">{u.site?.name || u.site?.slug || "-"}</td>
                        <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {editingUserId === u.id ? (
                            <div className="row">
                              <button className="btn btn-primary" onClick={() => onUpdateUser(u.id)}>Save</button>
                              <button className="btn" onClick={cancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <div className="row">
                              <button className="btn" onClick={() => startEdit(u)}>Edit</button>
                              <button className="btn" onClick={() => onDeleteUser(u.id)}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="spacer" />

          <div className="card card-pad">
            <div className="section-title">{t("platformUsers.organizationUsers")}</div>
            <div className="spacer-sm" />
            {organizationUsers.length === 0 ? (
              <EmptyState title={t("platformUsers.noOrganizationUsersFound")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("platformUsers.email")}</th>
                      <th>{t("platformUsers.siteRole")}</th>
                      <th>{t("platformUsers.platformRole")}</th>
                      <th>{t("platformUsers.organization")}</th>
                      <th>{t("platformUsers.created")}</th>
                      <th>{t("platformUsers.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizationUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          {editingUserId === u.id ? (
                            <select className="input" value={editSiteRole} onChange={(e) => setEditSiteRole(e.target.value)}>
                              <option value="viewer">{t("users.viewer")}</option>
                              <option value="editor">{t("users.editor")}</option>
                              <option value="editor-in-chief">Editor-in-Chief</option>
                              <option value="marketing">Marketing</option>
                              <option value="admin">{t("users.admin")}</option>
                              <option value="owner">Owner</option>
                            </select>
                          ) : (
                            <span className="badge gray">{formatRoleName(u.siteRole || mapOldRoleToSiteRole(u.role) || "viewer")}</span>
                          )}
                        </td>
                        <td>
                          {editingUserId === u.id ? (
                            <select className="input" value={editPlatformRole} onChange={(e) => setEditPlatformRole(e.target.value)}>
                              <option value="user">User</option>
                              <option value="editor-in-chief">Editor-in-Chief</option>
                              <option value="admin">{t("users.admin")}</option>
                              <option value="owner">Owner</option>
                              <option value="platform_admin">Platform Admin</option>
                            </select>
                          ) : (
                            <span className="badge gray">{formatRoleName(u.platformRole || "user")}</span>
                          )}
                        </td>
                        <td className="text-muted">{u.site?.name || u.site?.slug || "-"}</td>
                        <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {editingUserId === u.id ? (
                            <div className="row">
                              <button className="btn btn-primary" onClick={() => onUpdateUser(u.id)}>{t("common.save")}</button>
                              <button className="btn" onClick={cancelEdit}>{t("common.cancel")}</button>
                            </div>
                          ) : (
                            <div className="row">
                              <button className="btn" onClick={() => startEdit(u)}>{t("common.edit")}</button>
                              <button className="btn" onClick={() => onDeleteUser(u.id)}>{t("common.delete")}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

