"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, Input, Skeleton } from "@repo/ui";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";
import {
  createPlatformRbacAssignment,
  createPlatformUser,
  deletePlatformRbacAssignment,
  deletePlatformUser,
  fetchPlatformRbacAssignments,
  fetchPlatformRbacEffective,
  fetchPlatformRbacRoles,
  fetchPlatformRbacUsers,
  type EffectivePermission,
  type PlatformRbacUser,
  type RbacAssignment,
  type RbacRole,
} from "@/lib/api";

type AccessTab = "assignments" | "roles";

const ROLE_BADGE_COLORS: Record<string, string> = {
  "platform root": "red",
  "platform admin": "orange",
  "platform developer": "blue",
  "platform support": "gray",
  "super admin": "red",
  "system admin": "orange",
  "system dev": "blue",
  "system support": "gray",
};

function normalizeRoleLabel(value: string): string {
  return value.trim().toLowerCase();
}

function roleBadgeColor(value: string): string {
  return ROLE_BADGE_COLORS[normalizeRoleLabel(value)] || "gray";
}

function userInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function isPlatformPowerAssignment(roleName: string): boolean {
  return roleName === "Platform Root" || roleName === "Platform Admin";
}

export default function PlatformUsersPage() {
  const t = useTranslations();
  const toast = useToast();
  const platformAccess = usePlatformAccess();

  const [activeTab, setActiveTab] = useState<AccessTab>("assignments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<PlatformRbacUser[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [assignments, setAssignments] = useState<RbacAssignment[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingEffective, setLoadingEffective] = useState(false);
  const [effective, setEffective] = useState<EffectivePermission[]>([]);
  const [assigning, setAssigning] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRoleId, setCreateRoleId] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlatformRbacUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManagePlatform = platformAccess.canManagePlatformRoles || platformAccess.canManagePlatformUsers;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData, assignmentsData] = await Promise.all([
        fetchPlatformRbacUsers(),
        fetchPlatformRbacRoles(),
        fetchPlatformRbacAssignments(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setAssignments(assignmentsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platformUsers.failedToLoadUsers");
      setError(message);
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const loadEffective = useCallback(
    async (userId: string) => {
      if (!userId) {
        setEffective([]);
        return;
      }

      setLoadingEffective(true);
      try {
        const next = await fetchPlatformRbacEffective(userId);
        setEffective(next);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("platformUsers.failedToLoadUsers");
        toast.push({ tone: "error", message });
      } finally {
        setLoadingEffective(false);
      }
    },
    [t, toast],
  );

  useEffect(() => {
    if (!canManagePlatform) return;
    void loadData();
  }, [canManagePlatform, loadData]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadEffective(selectedUserId);
  }, [loadEffective, selectedUserId]);

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, RbacAssignment[]>();
    for (const assignment of assignments) {
      const current = map.get(assignment.userId) ?? [];
      current.push(assignment);
      map.set(assignment.userId, current);
    }
    return map;
  }, [assignments]);

  const filteredUsers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const assignmentRoleNames = (assignmentsByUser.get(user.id) ?? []).map((assignment) => assignment.role.name);
      const blob = [
        user.email,
        user.orgId ?? "",
        ...assignmentRoleNames,
      ]
        .join(" ")
        .toLowerCase();

      return !needle || blob.includes(needle);
    });
  }, [assignmentsByUser, searchQuery, users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const selectedAssignments = useMemo(
    () => assignmentsByUser.get(selectedUserId) ?? [],
    [assignmentsByUser, selectedUserId],
  );

  const assignableRoles = useMemo(() => {
    const assignedRoleIds = new Set(selectedAssignments.map((assignment) => assignment.roleId));
    return roles.filter((role) => !assignedRoleIds.has(role.id));
  }, [roles, selectedAssignments]);

  const totalAssignedUsers = useMemo(
    () => users.filter((user) => (assignmentsByUser.get(user.id) ?? []).length > 0).length,
    [assignmentsByUser, users],
  );

  const platformPowerUsers = useMemo(
    () =>
      users.filter((user) =>
        (assignmentsByUser.get(user.id) ?? []).some((assignment) => isPlatformPowerAssignment(assignment.role.name)),
      ).length,
    [assignmentsByUser, users],
  );

  const developerUsers = useMemo(
    () =>
      users.filter((user) =>
        (assignmentsByUser.get(user.id) ?? []).some((assignment) => assignment.role.name === "Platform Developer"),
      ).length,
    [assignmentsByUser, users],
  );

  const resetCreateForm = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateRoleId("");
  };

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRoleId) return;

    setAssigning(true);
    try {
      await createPlatformRbacAssignment({ userId: selectedUserId, roleId: selectedRoleId });
      toast.push({ tone: "success", message: t("platformUsers.roleAssigned") });
      setSelectedRoleId("");
      await loadData();
      await loadEffective(selectedUserId);
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : t("platformUsers.failedToAssignRole"),
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await deletePlatformRbacAssignment(assignmentId);
      toast.push({ tone: "success", message: t("platformUsers.roleRemoved") });
      await loadData();
      await loadEffective(selectedUserId);
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : t("platformUsers.failedToRemoveRole"),
      });
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createEmail || !createPassword) return;

    setCreating(true);
    try {
      const user = await createPlatformUser({
        email: createEmail,
        password: createPassword,
      });

      if (createRoleId) {
        await createPlatformRbacAssignment({ userId: user.id, roleId: createRoleId });
      }

      toast.push({ tone: "success", message: t("platformUsers.userCreatedSuccessfully") });
      setShowCreateModal(false);
      resetCreateForm();
      await loadData();
      setSelectedUserId(user.id);
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : t("platformUsers.failedToCreateUser"),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deletePlatformUser(deleteTarget.id);
      toast.push({ tone: "success", message: t("platformUsers.userDeletedSuccessfully") });
      if (selectedUserId === deleteTarget.id) {
        setSelectedUserId("");
        setEffective([]);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast.push({
        tone: "error",
        message: err instanceof Error ? err.message : t("platformUsers.failedToDeleteUser"),
      });
    } finally {
      setDeleting(false);
    }
  };

  if (platformAccess.isLoading && !canManagePlatform) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("common.loading")}</div>
      </div>
    );
  }

  if (!canManagePlatform) {
    return (
      <div className="card card-pad">
        <div className="font-black">{t("devPanel.common.accessDeniedTitle")}</div>
        <div className="text-muted text-xs mt-1.5">{t("platformUsers.platformRbacOnly")}</div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <div className="card card-pad">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="view-title">{t("platformUsers.title")}</div>
            <div className="view-sub">{t("platformUsers.platformRbacDescription")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              {t("platformUsers.createNewUser")}
            </Button>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card card-pad tight">
          <div className="detail-label">{t("platformUsers.totalUsers")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{users.length}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("platformUsers.usersWithPlatformRoles")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{totalAssignedUsers}</div>
        </div>
        <div className="card card-pad tight">
          <div className="detail-label">{t("platformUsers.platformPowerUsers")}</div>
          <div className="text-xl font-extrabold leading-tight mt-1">{platformPowerUsers}</div>
          <div className="detail-label mt-1">{t("platformUsers.platformDevelopersCount", { count: developerUsers })}</div>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="row-wrap justify-start">
          <button
            className={`btn ${activeTab === "assignments" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("assignments")}
          >
            {t("platformUsers.platformAssignments")}
          </button>
          <button
            className={`btn ${activeTab === "roles" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("roles")}
          >
            {t("platformUsers.systemRoles")}
          </button>
        </div>
      </div>

      <div className="spacer" />

      {loading ? (
        <div className="card card-pad">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full mb-2" />
        </div>
      ) : error ? (
        <div className="card card-pad">
          <div className="text-error">{error}</div>
          <div className="spacer-sm" />
          <Button variant="outline" onClick={() => void loadData()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : activeTab === "roles" ? (
        <div className="space-y-3">
          {roles.length === 0 ? (
            <div className="card card-pad text-muted">{t("platformUsers.noPlatformRoles")}</div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="card card-pad">
                <div className="row-between flex-wrap">
                  <div>
                    <div className="font-black text-[15px]">{role.name}</div>
                    <div className="detail-label">{role.description || t("platformUsers.systemRolePreset")}</div>
                  </div>
                  <div className="row-wrap">
                    <span className={`badge ${roleBadgeColor(role.name)}`}>{role.name}</span>
                    <span className="badge gray">{t("platformUsers.capabilitiesCount", { count: role.capabilities.length })}</span>
                  </div>
                </div>

                <div className="overflow-x-auto mt-3">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("platformUsers.capability")}</th>
                        <th>{t("platformUsers.key")}</th>
                        <th>{t("platformUsers.module")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {role.capabilities.map((capability) => (
                        <tr key={`${role.id}-${capability.key}`}>
                          <td>{capability.label || capability.key}</td>
                          <td className="text-muted">{capability.key}</td>
                          <td>{capability.module}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="space-y-3">
            <div className="card card-pad">
              <Input
                placeholder={t("platformUsers.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="card card-pad">
                <EmptyState
                  title={t("platformUsers.noUsersFound")}
                  description={searchQuery ? t("platformUsers.tryDifferentSearch") : t("platformUsers.noPlatformAssignmentsYet")}
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
                        <th>{t("platformUsers.created")}</th>
                        <th className="text-right pr-5">{t("platformUsers.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const userAssignments = assignmentsByUser.get(user.id) ?? [];
                        const platformRoleNames = userAssignments.map((assignment) => assignment.role.name);
                        const isSelected = selectedUserId === user.id;

                        return (
                          <tr
                            key={user.id}
                            className={`group cursor-pointer transition-colors ${isSelected ? "bg-surface/50" : "hover:bg-surface/30"}`}
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            <td className="pl-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-[11px] font-bold shrink-0">
                                  {userInitials(user.email)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{user.email}</div>
                                  <div className="text-[11px] text-muted truncate">{user.orgId || "-"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1.5">
                                {platformRoleNames.map((roleName) => (
                                  <span key={`${user.id}-${roleName}`} className={`badge ${roleBadgeColor(roleName)}`}>
                                    {roleName}
                                  </span>
                                ))}
                                {platformRoleNames.length === 0 ? <span className="text-xs text-muted">No platform role</span> : null}
                              </div>
                            </td>
                            <td>
                              <div className="text-sm text-muted" title={new Date(user.createdAt).toLocaleString()}>
                                {timeAgo(user.createdAt)}
                              </div>
                            </td>
                            <td className="text-right pr-5" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => setDeleteTarget(user)}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="card card-pad">
              {!selectedUser ? (
                <div className="text-muted">{t("platformUsers.selectUserToManage")}</div>
              ) : (
                <>
                  <div className="row-between flex-wrap">
                    <div>
                      <div className="font-black text-[15px]">{selectedUser.email}</div>
                      <div className="detail-label">{selectedUser.orgId || "-"}</div>
                    </div>
                    <span className="badge gray">{t("platformUsers.platformAssignments")}</span>
                  </div>

                  <div className="space-y-2 mt-3">
                    {selectedAssignments.length === 0 ? (
                      <div className="text-muted">{t("platformUsers.noPlatformRolesAssigned")}</div>
                    ) : (
                      selectedAssignments.map((assignment) => (
                        <div key={assignment.id} className="card card-pad tight">
                          <div className="row-between flex-wrap">
                            <div>
                              <div className="font-semibold">{assignment.role.name}</div>
                              <div className="detail-label">{assignment.role.capabilities.length} {t("platformUsers.capabilitiesShort")}</div>
                            </div>
                            <div className="row-wrap">
                              <span className={`badge ${roleBadgeColor(assignment.role.name)}`}>{assignment.role.name}</span>
                              <Button variant="ghost" size="sm" onClick={() => void handleRemoveAssignment(assignment.id)}>
                                {t("common.delete")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] mt-4">
                    <select
                      className="input"
                      value={selectedRoleId}
                      onChange={(event) => setSelectedRoleId(event.target.value)}
                    >
                      <option value="">{t("platformUsers.selectRoleToAssign")}</option>
                      {assignableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <Button variant="primary" onClick={() => void handleAssignRole()} isLoading={assigning} disabled={!selectedRoleId}>
                      {t("platformUsers.assignRole")}
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="card card-pad">
              <div className="section-title">{t("platformUsers.effectivePlatformAccess")}</div>
              <div className="text-muted text-xs mt-1.5">{t("platformUsers.effectivePlatformAccessHint")}</div>

              <div className="overflow-x-auto mt-3">
                {loadingEffective ? (
                  <div className="text-muted">{t("orgEffective.calculatingAccess")}</div>
                ) : effective.length === 0 ? (
                  <div className="text-muted">{t("platformUsers.noEffectiveAccess")}</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("platformUsers.capability")}</th>
                        <th>{t("platformUsers.access")}</th>
                        <th>{t("platformUsers.roleSources")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effective.map((item) => (
                        <tr key={item.key}>
                          <td>{item.key}</td>
                          <td>
                            <span className={`badge ${item.allowed ? "green" : "gray"}`}>
                              {item.allowed ? t("orgEffective.yes") : t("orgEffective.no")}
                            </span>
                          </td>
                          <td className="text-muted">
                            {Array.isArray(item.roleSources) && item.roleSources.length > 0
                              ? item.roleSources.map((source) => (typeof source === "string" ? source : source.roleName || source.name || source.id || "Unknown")).join(", ")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => {
          if (creating) return;
          setShowCreateModal(false);
          resetCreateForm();
        }}
        title={t("platformUsers.createNewUser")}
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label={t("platformUsers.email")}
            type="email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            placeholder="user@example.com"
            required
          />
          <Input
            label={t("platformUsers.password")}
            type="password"
            value={createPassword}
            onChange={(event) => setCreatePassword(event.target.value)}
            placeholder="Min. 8 characters"
            minLength={8}
            required
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
              {t("platformUsers.initialPlatformRole")}
            </label>
            <select className="input w-full" value={createRoleId} onChange={(event) => setCreateRoleId(event.target.value)}>
              <option value="">{t("platformUsers.noPlatformRole")}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-muted mt-1.5">{t("platformUsers.newUserCompatibilityHint")}</div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="primary" type="submit" isLoading={creating}>
              {t("platformUsers.createNewUser")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
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
