"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  fetchMySites,
  fetchRbacCapabilities,
  fetchRbacEffectivePermissions,
  fetchOrgUsers,
  type EffectivePermission,
  type UserSummary,
} from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import { CAPABILITY_MODULES, type CapabilityModule, type RbacCapability } from "@repo/schemas";
import SearchAndFilters from "@/components/ui/SearchAndFilters";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";
import { useTranslations } from "@/hooks/useTranslations";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";

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

export default function OrgEffectivePermissionsPage() {
  const params = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const orgId = params?.orgId ?? "";
  const defaultSiteId = searchParams?.get("siteId") ?? "";
  const { push } = useToast();
  const t = useTranslations();
  const platformAccess = usePlatformAccess();
  const moduleLabel = useCallback((module: CapabilityModule) => t(MODULE_LABEL_KEYS[module]), [t]);

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
  const isOwner = platformAccess.canViewBilling;

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
      setError(toFriendlyMessage(err, t("orgEffective.failedToLoadPermissions")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

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
        push({ tone: "error", message: toFriendlyMessage(err, t("orgEffective.failedToLoadEffectivePermissions")) });
      } finally {
        setLoadingEffective(false);
      }
    },
    [orgId, push, t]
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
      .map((source) => (typeof source === "string" ? source : source.roleName || source.name || source.id || t("orgEffective.unknown")))
      .join(", ");
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div style={{ color: "var(--muted)" }}>{t("orgEffective.loadingEffectivePermissions")}</div>
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
    <div className="org-settings-page">
      <div className="card card-pad">
        <div className="section-title">{t("orgEffective.title")}</div>
        <div className="detail-label" style={{ marginTop: 6 }}>
          {t("orgEffective.description")}
        </div>
        <div className="spacer-sm" />
        <div className="card" style={{ padding: 12, borderRadius: 18, background: "rgba(0,163,255,0.08)", border: "1px solid rgba(0,163,255,0.25)" }}>
          <span style={{ fontSize: 12 }}>
            {t("orgEffective.hint")}
          </span>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="grid" style={{ gap: 12 }}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgEffective.user")}</label>
            <select className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">{t("orgEffective.selectUser")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgEffective.siteOptional")}</label>
            <select className="input" value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
              <option value="">{t("orgEffective.organizationScope")}</option>
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
        placeholder={t("orgEffective.searchOptions")}
        filters={[
          {
            key: "module",
            label: t("orgEffective.module"),
            value: moduleFilter,
            options: [
              { value: "all", label: t("common.all") },
              ...CAPABILITY_MODULES.filter((module) => (isOwner ? true : module !== "billing")).map((module) => ({
                value: module,
                label: moduleLabel(module),
              })),
            ],
            onChange: setModuleFilter,
          },
        ]}
      />

      <div className="spacer" />

      {!selectedUserId ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>{t("orgEffective.selectUserToView")}</div>
      ) : loadingEffective ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>{t("orgEffective.calculatingAccess")}</div>
      ) : groupedCapabilities.length === 0 ? (
        <div className="card card-pad" style={{ color: "var(--muted)" }}>{t("orgEffective.noOptionsForFilters")}</div>
      ) : (
        groupedCapabilities.map((group) => (
          <div key={group.module} className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>{moduleLabel(group.module)}</div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("orgEffective.columns.option")}</th>
                    <th>{t("orgEffective.columns.access")}</th>
                    <th>{t("orgEffective.columns.policy")}</th>
                    <th>{t("orgEffective.columns.reason")}</th>
                    <th>{t("orgEffective.columns.roleSources")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((capability) => {
                    const entry = effectiveMap.get(capability.key);
                    const allowed = Boolean(entry?.allowed);
                    const policyEnabled = entry?.policyEnabled ?? capability.policyEnabled ?? true;
                    const reason = entry?.reason || (allowed ? t("orgEffective.reasonFromRole") : policyEnabled ? t("orgEffective.reasonMissingInRoles") : t("orgEffective.reasonDisabledByPolicy"));
                    return (
                      <tr key={capability.key}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{capability.label}</div>
                          <div className="detail-label">{capability.key}</div>
                        </td>
                        <td><span className={allowed ? "badge green" : "badge gray"}>{allowed ? t("orgEffective.yes") : t("orgEffective.no")}</span></td>
                        <td><span className={policyEnabled ? "badge green" : "badge orange"}>{policyEnabled ? t("orgEffective.enabled") : t("orgEffective.disabled")}</span></td>
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
