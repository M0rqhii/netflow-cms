"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  decodeAuthToken,
  fetchMySites,
  fetchRbacCapabilities,
  fetchRbacEffectivePermissions,
  fetchOrgUsers,
  getAuthToken,
  type EffectivePermission,
  type UserSummary,
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { CAPABILITY_MODULES, type CapabilityModule, type RbacCapability } from "@repo/schemas";
import SearchAndFilters from "@/components/ui/SearchAndFilters";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";

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

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? "").toLowerCase();
  return roleMarker === "org_owner" || roleMarker === "owner" || roleMarker === "platform_owner";
}

export default function OrgEffectivePermissionsPage() {
  const params = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const orgId = params?.orgId ?? "";
  const defaultSiteId = searchParams?.get("siteId") ?? "";
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [effective, setEffective] = useState<EffectivePermission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId);
  const [loadingEffective, setLoadingEffective] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const isOwner = useMemo(() => getOwnerFlag(), []);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, sitesData, capabilitiesData] = await Promise.all([
        fetchOrgUsers(orgId),
        fetchMySites(),
        fetchRbacCapabilities(orgId),
      ]);
      setUsers(usersData);
      setSites(sitesData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(toFriendlyMessage(err, "Failed to load permissions."));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const loadEffective = useCallback(
    async (userId: string, siteId?: string) => {
      if (!userId) {
        setEffective([]);
        return;
      }
      setLoadingEffective(true);
      try {
        const data = await fetchRbacEffectivePermissions(orgId, {
          userId,
          siteId: siteId ? siteId : null,
        });
        setEffective(data);
      } catch (err) {
        push({ tone: "error", message: toFriendlyMessage(err, "Failed to load effective permissions.") });
      } finally {
        setLoadingEffective(false);
      }
    },
    [orgId, push]
  );

  useEffect(() => {
    if (!orgId) return;
    loadBaseData();
  }, [loadBaseData, orgId]);

  useEffect(() => {
    loadEffective(selectedUserId, selectedSiteId);
  }, [loadEffective, selectedUserId, selectedSiteId]);

  const effectiveMap = useMemo(() => new Map(effective.map((item) => [item.key, item])), [effective]);

  const filteredCapabilities = useMemo(() => {
    return capabilities.filter((capability) => {
      if (!isOwner && capability.module === "billing") return false;
      const matchesModule = moduleFilter === "all" || capability.module === moduleFilter;
      const searchValue = `${capability.label} ${capability.key} ${capability.description ?? ""}`.toLowerCase();
      const matchesSearch = !searchQuery || searchValue.includes(searchQuery.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [capabilities, moduleFilter, searchQuery, isOwner]);

  const groupedCapabilities = useMemo(() => {
    return CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing"))
      .map((module) => ({
        module,
        items: filteredCapabilities.filter((capability) => capability.module === module),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredCapabilities, isOwner]);

  const resolveRoleSources = (entry?: EffectivePermission) => {
    if (!entry?.roleSources || entry.roleSources.length === 0) return "-";
    return entry.roleSources
      .map((source) => (typeof source === "string" ? source : source.roleName || source.name || source.id || "Unknown"))
      .join(", ");
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div style={{ color: "var(--muted)" }}>Loading effective permissions...</div>
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
    <div>
      <div className="card card-pad">
        <div className="section-title">Effective permissions</div>
        <div className="detail-label" style={{ marginTop: 6 }}>
          Final permissions after role + policy resolution.
        </div>
        <div className="spacer-sm" />
        <div className="card" style={{ padding: 12, borderRadius: 18, background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.25)" }}>
          <span style={{ fontSize: 12 }}>
            Select a user and optionally a site to see the resulting access.
          </span>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="grid" style={{ gap: 12 }}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">User</label>
            <select className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Site (optional)</label>
            <select className="input" value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
              <option value="">Organization scope</option>
              {sites.map((site) => (
                <option key={site.siteId} value={site.siteId}>{site.site.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search options"
        filters={[
          {
            key: "module",
            label: "Module",
            value: moduleFilter,
            options: [
              { value: "all", label: "All" },
              ...CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing")).map((module) => ({
                value: module,
                label: MODULE_LABELS[module],
              })),
            ],
            onChange: setModuleFilter,
          },
        ]}
      />

      <div className="spacer" />

      {!selectedUserId ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>Select a user to view effective permissions.</div>
      ) : loadingEffective ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>Calculating access...</div>
      ) : groupedCapabilities.length === 0 ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>No options for the selected filters.</div>
      ) : (
        groupedCapabilities.map((group) => (
          <div key={group.module} className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>{MODULE_LABELS[group.module]}</div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Access</th>
                    <th>Policy</th>
                    <th>Reason</th>
                    <th>Role sources</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((capability) => {
                    const entry = effectiveMap.get(capability.key);
                    const allowed = Boolean(entry?.allowed);
                    const policyEnabled = entry?.policyEnabled ?? capability.policyEnabled ?? true;
                    const reason = entry?.reason || (allowed ? "From role" : policyEnabled ? "Missing in roles" : "Disabled by policy");
                    return (
                      <tr key={capability.key}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{capability.label}</div>
                          <div className="detail-label">{capability.key}</div>
                        </td>
                        <td><span className={allowed ? "badge green" : "badge gray"}>{allowed ? "Yes" : "No"}</span></td>
                        <td><span className={policyEnabled ? "badge green" : "badge orange"}>{policyEnabled ? "Enabled" : "Disabled"}</span></td>
                        <td style={{ color: "var(--muted)" }}>{reason}</td>
                        <td>{resolveRoleSources(entry)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
