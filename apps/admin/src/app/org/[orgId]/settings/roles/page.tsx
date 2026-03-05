"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import {
  createRbacRole,
  deleteRbacRole,
  fetchRbacCapabilities,
  fetchRbacRoles,
  getAuthToken,
  decodeAuthToken,
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

type RoleEditorState = {
  name: string;
  description: string;
  scope: "ORG" | "SITE";
  capabilityKeys: CapabilityKey[];
};

const MODULE_LABELS: Record<CapabilityModule, string> = {
  org: "Organization",
  billing: "Billing",
  sites: "Sites",
  builder: "Builder",
  content: "Content",
  hosting: "Hosting",
  domains: "Domains",
  marketing: "Marketing",
  analytics: "Analytics",
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

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? "").toLowerCase();
  return roleMarker === "org_owner" || roleMarker === "owner" || roleMarker === "platform_owner";
}

export default function OrgRolesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();

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

  const isOwner = useMemo(() => getOwnerFlag(), []);

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
      setError(toFriendlyMessage(err, "Failed to load roles."));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

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
        name: mode === "duplicate" ? `${role.name} Copy` : role.name,
        description: role.description ?? "",
        scope: role.scope,
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
      push({ tone: "error", message: "Role name is required." });
      return;
    }
    if (editorState.capabilityKeys.length === 0) {
      push({ tone: "error", message: "Select at least one capability." });
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
        push({ tone: "success", message: "Role updated." });
      } else {
        await createRbacRole(orgId, {
          name: editorState.name,
          description: editorState.description,
          scope: editorState.scope,
          capabilityKeys: editorState.capabilityKeys,
        });
        push({ tone: "success", message: "Role created." });
      }
      setEditorOpen(false);
      setEditorState({ name: "", description: "", scope: "SITE", capabilityKeys: [] });
      await loadData();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to save role.") });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    setDeleting(true);
    try {
      await deleteRbacRole(orgId, deleteRoleId, true);
      push({ tone: "success", message: "Role removed." });
      setDeleteRoleId(null);
      await loadData();
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, "Failed to delete role.") });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">Loading roles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-pad">
        <div className="text-error">{error}</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="card card-pad">
        <div className="row-wrap justify-start">
          <button className={clsx("btn", activeTab === "system" ? "btn-primary" : "btn-outline")} onClick={() => setActiveTab("system")}>System roles</button>
          <button className={clsx("btn", activeTab === "custom" ? "btn-primary" : "btn-outline")} onClick={() => setActiveTab("custom")}>Custom roles</button>
          {activeTab === "custom" && (
            <button className="btn btn-primary" onClick={() => openEditor("create")}>Create role</button>
          )}
        </div>
      </div>

      <div className="spacer" />

      {activeTab === "system" ? (
        <div className="space-y-3">
          {systemRoles.length === 0 ? (
            <div className="card card-pad text-muted">No system roles.</div>
          ) : (
            systemRoles.map((role) => {
              const expanded = expandedRoles[role.id] ?? false;
              const visibleRoleCaps = (role.capabilities || []).filter((cap) => (isOwner ? true : cap.module !== "billing"));
              return (
                <div key={role.id} className="card card-pad">
                  <div className="row-start flex-wrap">
                    <div>
                      <div className="font-black text-[15px]">{role.name}</div>
                      <div className="detail-label">{role.description || "System role preset."}</div>
                    </div>
                    <div className="row-wrap">
                      <span className="badge gray">{role.scope}</span>
                      <span className="badge green">System</span>
                      <button className="btn" onClick={() => setExpandedRoles((prev) => ({ ...prev, [role.id]: !expanded }))}>
                        {expanded ? "Hide" : "Show"} capabilities
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-2.5">
                      {visibleRoleCaps.length === 0 ? (
                        <div className="text-muted">No capabilities to show.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Capability</th>
                                <th>Key</th>
                                <th>Module</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRoleCaps.map((cap) => (
                                <tr key={`${role.id}-${cap.key}`}>
                                  <td>{cap.label ?? cap.key}</td>
                                  <td className="text-muted">{cap.key}</td>
                                  <td>{MODULE_LABELS[cap.module]}</td>
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
            placeholder="Search custom roles"
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

          {filteredCustomRoles.length === 0 ? (
            <div className="card card-pad text-muted">No custom roles.</div>
          ) : (
            filteredCustomRoles.map((role) => (
              <div key={role.id} className="card card-pad">
                <div className="row-start flex-wrap">
                  <div>
                    <div className="font-black text-[15px]">{role.name}</div>
                    <div className="detail-label">{role.description || "Custom role"}</div>
                  </div>
                  <div className="row-wrap">
                    <span className="badge gray">{role.scope}</span>
                    <span className="badge orange">Custom</span>
                    <span className="badge gray">{role.capabilities.length} caps</span>
                  </div>
                </div>
                <div className="row-between flex-wrap mt-2.5">
                  <div className="detail-label">
                    {role.capabilities.slice(0, 4).map((cap) => cap.label ?? cap.key).join(", ")}
                    {role.capabilities.length > 4 ? "..." : ""}
                  </div>
                  <div className="row-wrap">
                    <button className="btn" onClick={() => openEditor("edit", role)}>Edit</button>
                    <button className="btn" onClick={() => openEditor("duplicate", role)}>Duplicate</button>
                    <button className="btn" onClick={() => setDeleteRoleId(role.id)}>Delete</button>
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
        title={editorMode === "edit" ? "Edit custom role" : editorMode === "duplicate" ? "Duplicate role" : "Create custom role"}
        className="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Role name</label>
              <Input value={editorState.name} onChange={(event) => setEditorState((prev) => ({ ...prev, name: event.target.value }))} placeholder="Role name" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Scope</label>
              <select
                className="input"
                value={editorState.scope}
                onChange={(event) => setEditorState((prev) => ({ ...prev, scope: event.target.value as "ORG" | "SITE" }))}
                disabled={editorMode === "edit"}
              >
                <option value="ORG">ORG - Organization-wide</option>
                <option value="SITE">SITE - Site-specific</option>
              </select>
              {editorMode === "edit" && (
                <p className="text-xs text-muted mt-1">Scope cannot be changed for existing roles.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Description</label>
              <Input value={editorState.description} onChange={(event) => setEditorState((prev) => ({ ...prev, description: event.target.value }))} placeholder="Optional description" />
            </div>
          </div>

          <div className="card card-pad">
            <div className="grid gap-2.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Search capabilities</label>
                <Input value={capabilitySearch} onChange={(event) => setCapabilitySearch(event.target.value)} placeholder="Search by label or key" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Module</label>
                <select className="input" value={capabilityModuleFilter} onChange={(event) => setCapabilityModuleFilter(event.target.value)}>
                  <option value="all">All modules</option>
                  {CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing")).map((module) => (
                    <option key={module} value={module}>{MODULE_LABELS[module]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-3" />

            {groupedCapabilities.length === 0 ? (
              <div className="text-muted">No results.</div>
            ) : (
              <div className="space-y-6">
                {groupedCapabilities.map((group) => (
                  <div key={group.module}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="detail-label">{MODULE_LABELS[group.module]}</div>
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
                          ? "Disabled by organization policy."
                          : blocked
                          ? "Reserved for system roles."
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
                                  <span className="badge orange">Dangerous</span>
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
              System roles are fixed. Custom roles are built by selecting capabilities.
            </div>
            <div className="row-wrap gap-2">
              <button className="btn" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {editorMode === "edit" ? "Save changes" : "Create role"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRoleId)}
        onClose={() => setDeleteRoleId(null)}
        onConfirm={handleDelete}
        title="Delete role"
        message="This will remove the role and all assignments. Continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
