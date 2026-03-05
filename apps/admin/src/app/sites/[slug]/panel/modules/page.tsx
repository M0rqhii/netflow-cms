"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { Button, ToggleSwitch } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import { fetchMySites } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";
import {
  BUILDER_MODULES,
  getBuilderModuleDependencies,
  getBuilderModuleDependents,
  getModuleDisplayTitle,
  type BuilderModuleKey,
} from "@/lib/page-builder/modules";
import { useSiteFeatures } from "@/lib/site-features";
import { useSiteModuleConfig } from "@/lib/site-module-config";

export default function SiteModulesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [site, setSite] = useState<SiteInfo | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [loadingSite, setLoadingSite] = useState(true);
  const [siteError, setSiteError] = useState<string | null>(null);

  const { features, loading: loadingFeatures, error: featuresError, updateOverride, isEnabled, isInPlan } = useSiteFeatures(siteId);
  const { config: moduleConfig, updateModuleConfig } = useSiteModuleConfig(siteId);
  const [draftConfig, setDraftConfig] = useState<Record<string, Record<string, unknown>>>({});

  const loadSite = useCallback(async () => {
    if (!slug) return;
    setLoadingSite(true);
    setSiteError(null);
    try {
      const sites = await fetchMySites();
      const current = sites.find((s: SiteInfo) => s.site.slug === slug) || null;
      if (!current) {
        setSite(null);
        setSiteId(null);
        setSiteError(t("siteModules.siteNotFound"));
        return;
      }
      setSite(current);
      setSiteId(current.siteId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("siteModules.loadSiteFailed");
      setSiteError(message);
      toast.push({ tone: "error", message });
    } finally {
      setLoadingSite(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadSite();
  }, [loadSite]);

  useEffect(() => {
    setDraftConfig(moduleConfig?.modules ?? {});
  }, [moduleConfig]);

  const handleToggle = useCallback(
    async (moduleKey: BuilderModuleKey, nextEnabled: boolean) => {
      if (!siteId || !features) return;

      if (!nextEnabled) {
        const dependents = getBuilderModuleDependents(moduleKey);
        const enabledDependents = dependents.filter((dep) => isEnabled(dep));
        if (enabledDependents.length > 0) {
          const depLabels = enabledDependents.map((dep) => getModuleDisplayTitle(dep)).join(", ");
          const confirmed = window.confirm(
            `${t("siteModules.disableDependentsConfirm")}: ${depLabels}. ${t("siteModules.disableDependentsConfirmHint")}`
          );
          if (!confirmed) return;
          for (const dep of enabledDependents) {
            await updateOverride(dep, false);
          }
        }
      }

      const deps = getBuilderModuleDependencies(moduleKey);
      const missingDeps = deps.filter((dep) => !isEnabled(dep));

      if (nextEnabled && missingDeps.length > 0) {
        const depLabels = missingDeps.map((dep) => getModuleDisplayTitle(dep)).join(", ");
        const confirmed = window.confirm(
          `${t("siteModules.enableDependenciesConfirm")}: ${depLabels}. ${t("siteModules.enableDependenciesConfirmHint")}`
        );
        if (!confirmed) return;

        for (const dep of missingDeps) {
          await updateOverride(dep, true);
        }
      }

      await updateOverride(moduleKey, nextEnabled);
      toast.push({
        tone: "success",
        message: nextEnabled ? t("siteModules.moduleEnabled") : t("siteModules.moduleDisabled"),
      });
    },
    [features, isEnabled, siteId, t, toast, updateOverride]
  );

  const planLabel = useMemo(() => {
    if (!features?.plan) return null;
    return features.plan.toUpperCase();
  }, [features]);

  const isLoading = loadingSite || loadingFeatures;
  const error = siteError || featuresError;

  const MODULE_SETTINGS: Record<
    string,
    {
      title: string;
      description: string;
      fields: Array<{
        key: string;
        label: string;
        type: "text" | "textarea" | "select" | "toggle" | "number";
        placeholder?: string;
        options?: Array<{ value: string; label: string }>;
        helper?: string;
      }>;
    }
  > = {
    "consent-security": {
      title: t("siteModules.settings.consentTitle"),
      description: t("siteModules.settings.consentDescription"),
      fields: [
        { key: "bannerTitle", label: t("siteModules.settings.bannerTitle"), type: "text" },
        { key: "bannerText", label: t("siteModules.settings.bannerText"), type: "textarea" },
        { key: "preferencesTitle", label: t("siteModules.settings.preferencesTitle"), type: "text" },
        { key: "preferencesText", label: t("siteModules.settings.preferencesText"), type: "textarea" },
        {
          key: "captchaProvider",
          label: t("siteModules.settings.captchaProvider"),
          type: "select",
          options: [
            { value: "none", label: t("siteModules.settings.captchaNone") },
            { value: "turnstile", label: "Cloudflare Turnstile" },
            { value: "recaptcha", label: "Google reCAPTCHA" },
          ],
        },
        { key: "captchaSiteKey", label: t("siteModules.settings.captchaSiteKey"), type: "text" },
      ],
    },
    "accessibility-widget": {
      title: t("siteModules.settings.accessibilityTitle"),
      description: t("siteModules.settings.accessibilityDescription"),
      fields: [
        {
          key: "position",
          label: t("siteModules.settings.position"),
          type: "select",
          options: [
            { value: "bottom-right", label: t("siteModules.settings.positionBottomRight") },
            { value: "bottom-left", label: t("siteModules.settings.positionBottomLeft") },
            { value: "top-right", label: t("siteModules.settings.positionTopRight") },
            { value: "top-left", label: t("siteModules.settings.positionTopLeft") },
          ],
        },
        { key: "enableTextScale", label: t("siteModules.settings.enableTextScale"), type: "toggle" },
        { key: "enableContrast", label: t("siteModules.settings.enableContrast"), type: "toggle" },
        { key: "enableFocus", label: t("siteModules.settings.enableFocus"), type: "toggle" },
        { key: "enableHighlightLinks", label: t("siteModules.settings.enableHighlightLinks"), type: "toggle" },
      ],
    },
    payments: {
      title: t("siteModules.settings.paymentsTitle"),
      description: t("siteModules.settings.paymentsDescription"),
      fields: [
        {
          key: "mode",
          label: t("siteModules.settings.paymentsMode"),
          type: "select",
          options: [
            { value: "test", label: t("siteModules.settings.paymentsModeTest") },
            { value: "live", label: t("siteModules.settings.paymentsModeLive") },
          ],
        },
        { key: "publicKey", label: t("siteModules.settings.paymentsPublicKey"), type: "text" },
        { key: "webhookSecret", label: t("siteModules.settings.paymentsWebhookSecret"), type: "text" },
      ],
    },
    "forms-pro": {
      title: t("siteModules.settings.formsTitle"),
      description: t("siteModules.settings.formsDescription"),
      fields: [
        { key: "allowUploads", label: t("siteModules.settings.allowUploads"), type: "toggle" },
        { key: "maxFileSizeMb", label: t("siteModules.settings.maxFileSize"), type: "number", placeholder: "20" },
        { key: "requireConsent", label: t("siteModules.settings.requireConsent"), type: "toggle" },
      ],
    },
    analytics: {
      title: t("siteModules.settings.analyticsTitle"),
      description: t("siteModules.settings.analyticsDescription"),
      fields: [
        { key: "measurementId", label: t("siteModules.settings.analyticsMeasurementId"), type: "text" },
        { key: "anonymizeIp", label: t("siteModules.settings.analyticsAnonymize"), type: "toggle" },
      ],
    },
    "meta-pixel": {
      title: t("siteModules.settings.pixelTitle"),
      description: t("siteModules.settings.pixelDescription"),
      fields: [{ key: "pixelId", label: t("siteModules.settings.pixelId"), type: "text" }],
    },
    "tag-manager": {
      title: t("siteModules.settings.gtmTitle"),
      description: t("siteModules.settings.gtmDescription"),
      fields: [{ key: "containerId", label: t("siteModules.settings.gtmContainerId"), type: "text" }],
    },
    "embeds-media": {
      title: t("siteModules.settings.embedsTitle"),
      description: t("siteModules.settings.embedsDescription"),
      fields: [{ key: "allowlistDomains", label: t("siteModules.settings.embedsAllowlist"), type: "textarea" }],
    },
    maps: {
      title: t("siteModules.settings.mapsTitle"),
      description: t("siteModules.settings.mapsDescription"),
      fields: [
        {
          key: "provider",
          label: t("siteModules.settings.mapsProvider"),
          type: "select",
          options: [
            { value: "osm", label: "OpenStreetMap" },
            { value: "google", label: "Google Maps" },
          ],
        },
        { key: "apiKey", label: t("siteModules.settings.mapsApiKey"), type: "text" },
        { key: "defaultZoom", label: t("siteModules.settings.mapsDefaultZoom"), type: "number", placeholder: "12" },
      ],
    },
    "blog-content": {
      title: t("siteModules.settings.blogTitle"),
      description: t("siteModules.settings.blogDescription"),
      fields: [
        { key: "postsPerPage", label: t("siteModules.settings.blogPostsPerPage"), type: "number", placeholder: "10" },
        { key: "showCategories", label: t("siteModules.settings.blogShowCategories"), type: "toggle" },
      ],
    },
  };

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="modules"
      title={t("sitePanelShell.modules.title", { site: site?.site?.name || slug })}
      subtitle={t("sitePanelShell.modules.subtitle")}
      actions={
        <>
          {planLabel ? <span className="badge gray">{t("siteModules.planLabel")}: {planLabel}</span> : null}
          {site ? <span className="badge gray">{t("siteModules.siteLabel")}: {site.site.slug}</span> : null}
        </>
      }
    >
      <div className="modules-page animate-fade-in">

        {error ? (
          <div className="error-alert">
            <div className="text-error">{error}</div>
          </div>
        ) : null}

        {error ? <div className="spacer-sm" /> : null}

        {isLoading ? (
          <div className="card card-pad">
            <div className="text-muted">{t("siteModules.loading")}</div>
          </div>
        ) : (
          <div className="grid cols-2 modules-grid">
            {BUILDER_MODULES.map((module) => {
              const enabled = isEnabled(module.key);
              const inPlan = isInPlan(module.key);
              const locked = !inPlan && !enabled;
              const deps = module.dependencies ?? [];

              return (
                <div key={module.key} className="card stat-card modules-card">
                  <div className="row-start modules-card-head">
                    <div className="row items-start">
                      <div className="pill h-9 w-9">{module.icon}</div>
                      <div>
                        <div className="project-name">{module.title}</div>
                        <div className="detail-label mt-2">{module.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {locked ? <span className="badge orange">{t("siteModules.plan")}</span> : null}
                      <span className={`badge ${enabled ? "green" : "gray"}`}>{enabled ? t("siteModules.enabled") : t("siteModules.disabled")}</span>
                    </div>
                  </div>

                  <div className="spacer-sm" />

                  {deps.length > 0 && (
                    <div className="detail-label">
                      {t("siteModules.requires")}: <strong>{deps.map(getModuleDisplayTitle).join(", ")}</strong>
                    </div>
                  )}

                  {module.plan && (
                    <div className="detail-label mt-2">
                      {t("siteModules.planTier")}: <strong>{module.plan.toUpperCase()}</strong>
                    </div>
                  )}

                  <div className="spacer-sm" />

                  <div className="row row-wrap">
                    <button
                      className={enabled ? "btn btn-outline" : "btn btn-primary"}
                      type="button"
                      disabled={locked}
                      onClick={() => handleToggle(module.key, !enabled)}
                    >
                      {enabled ? t("siteModules.disable") : locked ? t("siteModules.locked") : t("siteModules.enable")}
                    </button>
                    {locked ? <span className="detail-label">{t("siteModules.upgradeHint")}</span> : null}
                  </div>

                  {MODULE_SETTINGS[module.key] && inPlan && (
                    <div className="modules-settings-wrap">
                      <div className="card tab-bar modules-settings-card">
                        <div className="row-start">
                          <div>
                            <div className="font-black detail-label">{MODULE_SETTINGS[module.key].title}</div>
                            <div className="detail-label mt-2">{MODULE_SETTINGS[module.key].description}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateModuleConfig(module.key, draftConfig[module.key] || {})}
                          >
                            {t("siteModules.settings.save")}
                          </Button>
                        </div>
                        <div className="spacer-sm" />
                        <div className="form-grid">
                          {MODULE_SETTINGS[module.key].fields.map((field) => {
                            const rawValue = (draftConfig[module.key] || {})[field.key];
                            const value = rawValue === null || rawValue === undefined ? "" : String(rawValue);
                            const numberValue = typeof rawValue === "number" ? rawValue : rawValue ? Number(rawValue) : "";

                            if (field.type === "toggle") {
                              return (
                                <label
                                  key={field.key}
                                  className="modules-toggle-row"
                                >
                                  <span className="detail-label">{field.label}</span>
                                  <ToggleSwitch
                                    checked={Boolean(value)}
                                    onChange={(e) => {
                                      const next = { ...(draftConfig[module.key] || {}) };
                                      next[field.key] = e.target.checked;
                                      setDraftConfig({ ...draftConfig, [module.key]: next });
                                    }}
                                  />
                                </label>
                              );
                            }

                            if (field.type === "textarea") {
                              return (
                                <label key={field.key} className="detail-label">
                                  <span className="form-label">{field.label}</span>
                                  <textarea
                                    className="input"
                                    rows={3}
                                    placeholder={field.placeholder}
                                    value={value}
                                    onChange={(e) => {
                                      const next = { ...(draftConfig[module.key] || {}) };
                                      next[field.key] = e.target.value;
                                      setDraftConfig({ ...draftConfig, [module.key]: next });
                                    }}
                                  />
                                </label>
                              );
                            }

                            if (field.type === "select") {
                              return (
                                <label key={field.key} className="detail-label">
                                  <span className="form-label">{field.label}</span>
                                  <select
                                    className="input"
                                    value={value || field.options?.[0]?.value || ""}
                                    onChange={(e) => {
                                      const next = { ...(draftConfig[module.key] || {}) };
                                      next[field.key] = e.target.value;
                                      setDraftConfig({ ...draftConfig, [module.key]: next });
                                    }}
                                  >
                                    {field.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            return (
                              <label key={field.key} className="detail-label">
                                <span className="form-label">{field.label}</span>
                                <input
                                  type={field.type === "number" ? "number" : "text"}
                                  className="input"
                                  placeholder={field.placeholder}
                                  value={field.type === "number" ? numberValue : value}
                                  onChange={(e) => {
                                    const next = { ...(draftConfig[module.key] || {}) };
                                    next[field.key] = field.type === "number" ? Number(e.target.value) : e.target.value;
                                    setDraftConfig({ ...draftConfig, [module.key]: next });
                                  }}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}
