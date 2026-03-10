"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import {
  createRbacRole,
  deleteRbacRole,
  fetchRbacCapabilities,
  fetchRbacRoles,
  updateRbacRole,
  type RbacRole,
} from "@/lib/api";
import { CAPABILITY_MODULES, type CapabilityKey, type CapabilityModule, type RbacCapability } from "@repo/schemas";
import { Input } from "@repo/ui";
import SearchAndFilters from "@/components/ui/SearchAndFilters";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

type RoleEditorState = {
  name: string;
  description: string;
  scope: "ORG" | "SITE";
  capabilityKeys: CapabilityKey[];
};

const MODULE_LABEL_KEYS: Record<CapabilityModule, string> = {
  org: "orgRbac.modules.org",
  billing: "orgRbac.modules.billing",
  sites: "orgRbac.modules.sites",
  platform: "orgRbac.modules.platform",
  builder: "orgRbac.modules.builder",
  content: "orgRbac.modules.content",
  hosting: "orgRbac.modules.hosting",
  domains: "orgRbac.modules.domains",
  marketing: "orgRbac.modules.marketing",
  analytics: "orgRbac.modules.analytics",
};

const BLOCKED_CUSTOM_ROLE_KEYS = new Set<CapabilityKey>([
  "org.roles.manage",
  "org.policies.manage",
  "builder.custom_code",
  "builder.site_roles.manage",
]);

const DANGEROUS_CAPABILITY_KEYS = new Set<CapabilityKey>([
  "builder.custom_code",
  "domains.dns.manage",
  "marketing.ads.manage",
]);

const SYSTEM_ROLE_MARKERS = new Set(["SYSTEM", "SYSTEM_ROLE", "SYSTEM-ROLE"]);

function normalizeRoleScope(scope?: string | null): string {
  return String(scope ?? "").toUpperCase();
}

function normalizeRoleType(type?: string | null): string {
  return String(type ?? "").toUpperCase();
}

function isSystemRole(role: RbacRole): boolean {
  const type = normalizeRoleType(role.type);
  return role.isImmutable || SYSTEM_ROLE_MARKERS.has(type) || type.startsWith("SYSTEM");
}

function isBlockedForCustomRole(capability: RbacCapability): boolean {
  if (capability.key.startsWith("billing.")) return true;
  if (BLOCKED_CUSTOM_ROLE_KEYS.has(capability.key)) return true;
  return Boolean(capability.metadata?.blockedForCustomRoles);
}

export default function OrgRolesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();
  const t = useTranslations();
  const platformAccess = usePlatformAccess();
  const moduleLabel = useCallback((module: CapabilityModule) => t(MODULE_LABEL_KEYS[module]), [t]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [activeTab, setActiveTab] = useState<"system" | "custom">("system");
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editorRoleId, setEditorRoleId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<RoleEditorState>({
    name: "",
    description: "",
    scope: "SITE",
    capabilityKeys: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [capabilitySearch, setCapabilitySearch] = useState("");
  const [capabilityModuleFilter, setCapabilityModuleFilter] = useState("all");

  const isOwner = platformAccess.canViewBilling;

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
      setError(toFriendlyMessage(err, t("orgRoles.failedToLoadRoles")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

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
      (role.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope = scopeFilter === "all" || normalizeRoleScope(role.scope) === normalizeRoleScope(scopeFilter);
    return matchesSearch && matchesScope;
  });

  const visibleCapabilities = useMemo(() => {
    return capabilities.filter((capability) => (isOwner ? true : capability.module !== "billing"));
  }, [capabilities, isOwner]);

  const filteredCapabilities = useMemo(() => {
    return visibleCapabilities.filter((capability) => {
      const matchesModule = capabilityModuleFilter === "all" || capability.module === capabilityModuleFilter;
      const searchValue = `${capability.label} ${capability.key} ${capability.description ?? ""}`.toLowerCase();
      const matchesSearch = !capabilitySearch || searchValue.includes(capabilitySearch.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [visibleCapabilities, capabilityModuleFilter, capabilitySearch]);

  const groupedCapabilities = useMemo(() => {
    return CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing"))
      .map((module) => ({
        module,
        items: filteredCapabilities.filter((capability) => capability.module === module),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredCapabilities, isOwner]);

  const openEditor = (mode: "create" | "edit" | "duplicate", role?: RbacRole) => {
    if (mode === "create") {
      setEditorRoleId(null);
      setEditorState({ name: "", description: "", scope: "SITE", capabilityKeys: [] });
    } else if (role) {
      setEditorRoleId(role.id);
      setEditorState({
        name: mode === "duplicate" ? `${role.name} ${t("orgRoles.copySuffix")}` : role.name,
        description: role.description ?? "",
        scope: normalizeRoleScope(role.scope) === "ORG" ? "ORG" : "SITE",
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
      push({ tone: "error", message: t("orgRoles.roleNameRequired") });
      return;
    }
    if (editorState.capabilityKeys.length === 0) {
      push({ tone: "error", message: t("orgRoles.selectAtLeastOneCapability") });
      return;
    }

    setSaving(true);
    try {
      if (editorMode === "edit" && editorRoleId) {
        await updateRbacRole(orgId, editorRoleId, {
          name: editorState.name,
          description: editorState.description,
          capabilityKeys: editorState.capabilityKeys,
        });
        push({ tone: "success", message: t("orgRoles.roleUpdated") });
      } else {
        await createRbacRole(orgId, {
          name: editorState.name,
          description: editorState.description,
          scope: editorState.scope,
          capabilityKeys: editorState.capabilityKeys,
        });
        push({ tone: "success", message: t("orgRoles.roleCreated") });
      }
      setEditorOpen(false);
      setEditorState({ name: "", description: "", scope: "SITE", capabilityKeys: [] });
      await loadData();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgRoles.failedToSaveRole")) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    setDeleting(true);
    try {
      await deleteRbacRole(orgId, deleteRoleId, true);
      push({ tone: "success", message: t("orgRoles.roleRemoved") });
      setDeleteRoleId(null);
      await loadData();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgRoles.failedToDeleteRole")) });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("orgRoles.loadingRoles")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-pad">
        <div className="text-error">{error}</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={loadData}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in org-settings-page">
      <div className="card card-pad">
        <div className="row-wrap justify-start">
          <button className={clsx("btn", activeTab === "system" ? "btn-primary" : "btn-outline")} onClick={() => setActiveTab("system")}>{t("orgRoles.systemRoles")}</button>
          <button className={clsx("btn", activeTab === "custom" ? "btn-primary" : "btn-outline")} onClick={() => setActiveTab("custom")}>{t("orgRoles.customRoles")}</button>
          {activeTab === "custom" && (
            <button className="btn btn-primary" onClick={() => openEditor("create")}>{t("orgRoles.createRole")}</button>
          )}
        </div>
      </div>

      <div className="spacer" />

      {activeTab === "system" ? (
        <div className="space-y-3">
          {systemRoles.length === 0 ? (
            <div className="card card-pad text-muted">{t("orgRoles.noSystemRoles")}</div>
          ) : (
            systemRoles.map((role) => {
              const expanded = expandedRoles[role.id] ?? false;
              const visibleRoleCaps = (role.capabilities || []).filter((cap) => (isOwner ? true : cap.module !== "billing"));
              return (
                <div key={role.id} className="card card-pad">
                  <div className="row-start flex-wrap">
                    <div>
                      <div className="font-black text-[15px]">{role.name}</div>
                      <div className="detail-label">{role.description || t("orgRoles.systemRolePreset")}</div>
                    </div>
                    <div className="row-wrap">
                      <span className="badge gray">{role.scope}</span>
                      <span className="badge green">{t("orgRoles.systemBadge")}</span>
                      <button className="btn" onClick={() => setExpandedRoles((prev) => ({ ...prev, [role.id]: !expanded }))}>
                        {expanded ? t("orgRoles.hideCapabilities") : t("orgRoles.showCapabilities")}
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-2.5">
                      {visibleRoleCaps.length === 0 ? (
                        <div className="text-muted">{t("orgRoles.noCapabilitiesToShow")}</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>{t("orgRoles.columns.capability")}</th>
                                <th>{t("orgRoles.columns.key")}</th>
                                <th>{t("orgRoles.columns.module")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRoleCaps.map((cap) => (
                                <tr key={`${role.id}-${cap.key}`}>
                                  <td>{cap.label ?? cap.key}</td>
                                  <td className="text-muted">{cap.key}</td>
                                  <td>{moduleLabel(cap.module)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={t("orgRoles.searchCustomRoles")}
            filters={[
              {
                key: "scope",
                label: t("orgRoles.scope"),
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

          {filteredCustomRoles.length === 0 ? (
            <div className="card card-pad text-muted">{t("orgRoles.noCustomRoles")}</div>
          ) : (
            filteredCustomRoles.map((role) => (
              <div key={role.id} className="card card-pad">
                <div className="row-start flex-wrap">
                  <div>
                    <div className="font-black text-[15px]">{role.name}</div>
                    <div className="detail-label">{role.description || t("orgRoles.customRoleFallback")}</div>
                  </div>
                  <div className="row-wrap">
                    <span className="badge gray">{role.scope}</span>
                    <span className="badge orange">{t("orgRoles.customBadge")}</span>
                    <span className="badge gray">{t("orgRoles.capabilitiesCount", { count: role.capabilities.length })}</span>
                  </div>
                </div>
                <div className="row-between flex-wrap mt-2.5">
                  <div className="detail-label">
                    {role.capabilities.slice(0, 4).map((cap) => cap.label ?? cap.key).join(", ")}
                    {role.capabilities.length > 4 ? "..." : ""}
                  </div>
                  <div className="row-wrap">
                    <button className="btn" onClick={() => openEditor("edit", role)}>{t("common.edit")}</button>
                    <button className="btn" onClick={() => openEditor("duplicate", role)}>{t("orgRoles.duplicate")}</button>
                    <button className="btn" onClick={() => setDeleteRoleId(role.id)}>{t("common.delete")}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editorMode === "edit" ? t("orgRoles.modal.editTitle") : editorMode === "duplicate" ? t("orgRoles.modal.duplicateTitle") : t("orgRoles.modal.createTitle")}
        className="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgRoles.modal.roleName")}</label>
              <Input value={editorState.name} onChange={(event) => setEditorState((prev) => ({ ...prev, name: event.target.value }))} placeholder={t("orgRoles.modal.roleNamePlaceholder")} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgRoles.scope")}</label>
              <select
                className="input"
                value={editorState.scope}
                onChange={(event) => setEditorState((prev) => ({ ...prev, scope: event.target.value as "ORG" | "SITE" }))}
                disabled={editorMode === "edit"}
              >
                <option value="ORG">{t("orgRoles.modal.scopeOrg")}</option>
                <option value="SITE">{t("orgRoles.modal.scopeSite")}</option>
              </select>
              {editorMode === "edit" && (
                <p className="text-xs text-muted mt-1">{t("orgRoles.modal.scopeEditHint")}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgRoles.modal.description")}</label>
              <Input value={editorState.description} onChange={(event) => setEditorState((prev) => ({ ...prev, description: event.target.value }))} placeholder={t("orgRoles.modal.descriptionPlaceholder")} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="grid gap-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgRoles.modal.searchCapabilities")}</label>
                <Input value={capabilitySearch} onChange={(event) => setCapabilitySearch(event.target.value)} placeholder={t("orgRoles.modal.searchCapabilitiesPlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgRoles.columns.module")}</label>
                <select className="input" value={capabilityModuleFilter} onChange={(event) => setCapabilityModuleFilter(event.target.value)}>
                  <option value="all">{t("orgRoles.modal.allModules")}</option>
                  {CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing")).map((module) => (
                    <option key={module} value={module}>{moduleLabel(module)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-3" />

            {groupedCapabilities.length === 0 ? (
              <div className="text-muted">{t("common.noResults")}</div>
            ) : (
              <div className="space-y-6">
                {groupedCapabilities.map((group) => (
                  <div key={group.module}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="detail-label">{moduleLabel(group.module)}</div>
                      <span className="badge gray">{group.items.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {group.items.map((capability) => {
                        const policyDisabled = capability.policyEnabled === false;
                        const blocked = isBlockedForCustomRole(capability);
                        const disabled = policyDisabled || blocked;
                        const checked = editorState.capabilityKeys.includes(capability.key);
                        const checkboxId = `cap-${capability.key}`;
                        const tooltip = policyDisabled
                          ? t("orgRoles.modal.disabledByPolicy")
                          : blocked
                          ? t("orgRoles.modal.reservedForSystemRoles")
                          : undefined;

                        return (
                          <label
                            key={capability.key}
                            htmlFor={checkboxId}
                            className={clsx(
                              "card",
                              "flex items-start gap-3",
                              "p-3",
                              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
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
                              <div className="row">
                                <span className="font-bold">{capability.label}</span>
                                {(capability.isDangerous || DANGEROUS_CAPABILITY_KEYS.has(capability.key)) && (
                                  <span className="badge orange">{t("orgRoles.dangerous")}</span>
                                )}
                              </div>
                              <div className="detail-label">{capability.key}</div>
                              {capability.description && (
                                <div className="detail-label mt-1">{capability.description}</div>
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

          <div className="row-between flex-wrap">
            <div className="detail-label">
              {t("orgRoles.modal.footerHint")}
            </div>
            <div className="row-wrap gap-2">
              <button className="btn" onClick={() => setEditorOpen(false)} disabled={saving}>{t("common.cancel")}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {editorMode === "edit" ? t("orgRoles.modal.saveChanges") : t("orgRoles.createRole")}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRoleId)}
        onClose={() => setDeleteRoleId(null)}
        onConfirm={handleDelete}
        title={t("orgRoles.confirmDeleteTitle")}
        message={t("orgRoles.confirmDeleteMessage")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
