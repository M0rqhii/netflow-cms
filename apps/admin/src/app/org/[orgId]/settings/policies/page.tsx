"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import {
  fetchRbacCapabilities,
  updateRbacPolicy,
  getAuthToken,
  decodeAuthToken,
} from "@/lib/api";
import { CAPABILITY_MODULES, type CapabilityModule, type RbacCapability } from "@repo/schemas";
import SearchAndFilters from "@/components/ui/SearchAndFilters";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyMessage } from "@/lib/errors";
import { useTranslations } from "@/hooks/useTranslations";

const MODULE_LABEL_KEYS: Record<CapabilityModule, string> = {
  org: "orgRbac.modules.org",
  billing: "orgRbac.modules.billing",
  sites: "orgRbac.modules.sites",
  builder: "orgRbac.modules.builder",
  content: "orgRbac.modules.content",
  hosting: "orgRbac.modules.hosting",
  domains: "orgRbac.modules.domains",
  marketing: "orgRbac.modules.marketing",
  analytics: "orgRbac.modules.analytics",
};

const DANGEROUS_CAPABILITY_KEYS = new Set([
  "builder.custom_code",
  "domains.dns.manage",
  "marketing.ads.manage",
]);

function getRiskLabel(riskLevel?: string | null, isDangerous?: boolean) {
  if (isDangerous) return "Dangerous";
  const normalized = String(riskLevel ?? "").toUpperCase();
  if (normalized === "LOW") return "Low";
  if (normalized === "MED" || normalized === "MEDIUM") return "Medium";
  if (normalized === "HIGH" || normalized === "DANGEROUS" || normalized === "CRITICAL") return "Dangerous";
  return normalized || "Unknown";
}

function getOwnerFlag(): boolean {
  const payload = decodeAuthToken(getAuthToken());
  const roleMarker = String(payload?.platformRole ?? payload?.role ?? "").toLowerCase();
  return (
    roleMarker === "org_owner" ||
    roleMarker === "owner" ||
    roleMarker === "platform_owner" ||
    roleMarker === "platform_admin"
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={clsx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-emerald-500" : "bg-border",
        disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
      )}
    >
      <span
        className={clsx(
          "inline-block h-5 w-5 transform rounded-full bg-surface shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function OrgPoliciesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? "";
  const { push } = useToast();
  const t = useTranslations();
  const moduleLabel = useCallback((module: CapabilityModule) => t(MODULE_LABEL_KEYS[module]), [t]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<RbacCapability[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const isOwner = useMemo(() => getOwnerFlag(), []);

  const loadCapabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRbacCapabilities(orgId);
      setCapabilities(data);
    } catch (err) {
      setError(toFriendlyMessage(err, t("orgPolicies.failedToLoadSettings")));
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    if (!orgId) return;
    loadCapabilities();
  }, [loadCapabilities, orgId]);

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

  const handleToggle = async (capability: RbacCapability) => {
    if (!capability.canBePolicyControlled) return;
    const nextValue = !(capability.policyEnabled ?? true);
    setUpdatingKey(capability.key);
    try {
      await updateRbacPolicy(orgId, capability.key, nextValue);
      setCapabilities((prev) =>
        prev.map((item) => (item.key === capability.key ? { ...item, policyEnabled: nextValue } : item))
      );
      push({ tone: "success", message: t("orgPolicies.settingSaved") });
    } catch (err) {
      push({ tone: "error", message: toFriendlyMessage(err, t("orgPolicies.failedToSaveSettings")) });
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("orgPolicies.loadingPolicies")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-pad">
        <div className="text-error">{error}</div>
        <div className="spacer-sm" />
        <button className="btn" onClick={loadCapabilities}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in org-settings-page">
      <div className="card card-pad">
        <div className="section-title">{t("orgPolicies.title")}</div>
        <div className="detail-label mt-1.5">
          {t("orgPolicies.description")}
        </div>
      </div>

      <div className="spacer" />

      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={t("orgPolicies.searchOptions")}
        filters={[
          {
            key: "module",
            label: t("orgPolicies.module"),
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

      {groupedCapabilities.length === 0 ? (
        <div className="card card-pad text-muted">{t("orgPolicies.noOptionsForFilters")}</div>
      ) : (
        groupedCapabilities.map((group) => (
          <div key={group.module} className="card card-pad mb-3.5">
            <div className="section-title mb-2.5">{moduleLabel(group.module)}</div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("orgPolicies.columns.option")}</th>
                    <th>{t("orgPolicies.columns.key")}</th>
                    <th>{t("orgPolicies.columns.policy")}</th>
                    <th>{t("orgPolicies.columns.risk")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((capability) => {
                    const policyEnabled = capability.policyEnabled ?? true;
                    const toggleDisabled = !capability.canBePolicyControlled || updatingKey === capability.key;
                    const risk = getRiskLabel(
                      capability.riskLevel,
                      capability.isDangerous || DANGEROUS_CAPABILITY_KEYS.has(capability.key)
                    );
                    return (
                      <tr key={capability.key}>
                        <td>
                          <div className="font-bold">{capability.label}</div>
                          {capability.description ? (
                            <div className="detail-label mt-1">{capability.description}</div>
                          ) : null}
                        </td>
                        <td className="text-muted">{capability.key}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <ToggleSwitch checked={policyEnabled} disabled={toggleDisabled} onChange={() => handleToggle(capability)} />
                            <span className="detail-label">
                              {!capability.canBePolicyControlled ? t("orgPolicies.fixed") : policyEnabled ? t("orgPolicies.enabled") : t("orgPolicies.disabled")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${risk === "Dangerous" ? "orange" : "gray"}`}>
                            {risk === "Dangerous"
                              ? t("orgPolicies.riskDangerous")
                              : risk === "Medium"
                              ? t("orgPolicies.riskMedium")
                              : risk === "Low"
                              ? t("orgPolicies.riskLow")
                              : t("orgPolicies.riskUnknown")}
                          </span>
                        </td>
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
