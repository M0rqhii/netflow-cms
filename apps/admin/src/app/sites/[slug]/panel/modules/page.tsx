
"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMySites } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import {
  BUILDER_MODULES,
  getBuilderModuleDependencies,
  getBuilderModuleDependents,
  getModuleDisplayTitle,
  type BuilderModuleKey,
} from '@/lib/page-builder/modules';
import { useSiteFeatures } from '@/lib/site-features';
import { useSiteModuleConfig } from '@/lib/site-module-config';

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
        setSiteError(t('siteModules.siteNotFound'));
        return;
      }
      setSite(current);
      setSiteId(current.siteId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('siteModules.loadSiteFailed');
      setSiteError(message);
      toast.push({ tone: 'error', message });
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
          const depLabels = enabledDependents.map((dep) => getModuleDisplayTitle(dep)).join(', ');
          const confirmed = window.confirm(
            `${t('siteModules.disableDependentsConfirm')}: ${depLabels}. ${t('siteModules.disableDependentsConfirmHint')}`
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
        const depLabels = missingDeps.map((dep) => getModuleDisplayTitle(dep)).join(', ');
        const confirmed = window.confirm(
          `${t('siteModules.enableDependenciesConfirm')}: ${depLabels}. ${t('siteModules.enableDependenciesConfirmHint')}`
        );
        if (!confirmed) return;

        for (const dep of missingDeps) {
          await updateOverride(dep, true);
        }
      }

      await updateOverride(moduleKey, nextEnabled);
      toast.push({
        tone: 'success',
        message: nextEnabled ? t('siteModules.moduleEnabled') : t('siteModules.moduleDisabled'),
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

const MODULE_SETTINGS: Record<string, { title: string; description: string; fields: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select' | 'toggle' | 'number'; placeholder?: string; options?: Array<{ value: string; label: string }>; helper?: string; }> }> = {
  'consent-security': {
    title: t('siteModules.settings.consentTitle'),
    description: t('siteModules.settings.consentDescription'),
    fields: [
      { key: 'bannerTitle', label: t('siteModules.settings.bannerTitle'), type: 'text' },
      { key: 'bannerText', label: t('siteModules.settings.bannerText'), type: 'textarea' },
      { key: 'preferencesTitle', label: t('siteModules.settings.preferencesTitle'), type: 'text' },
      { key: 'preferencesText', label: t('siteModules.settings.preferencesText'), type: 'textarea' },
      {
        key: 'captchaProvider',
        label: t('siteModules.settings.captchaProvider'),
        type: 'select',
        options: [
          { value: 'none', label: t('siteModules.settings.captchaNone') },
          { value: 'turnstile', label: 'Cloudflare Turnstile' },
          { value: 'recaptcha', label: 'Google reCAPTCHA' },
        ],
      },
      { key: 'captchaSiteKey', label: t('siteModules.settings.captchaSiteKey'), type: 'text' },
    ],
  },
  'accessibility-widget': {
    title: t('siteModules.settings.accessibilityTitle'),
    description: t('siteModules.settings.accessibilityDescription'),
    fields: [
      {
        key: 'position',
        label: t('siteModules.settings.position'),
        type: 'select',
        options: [
          { value: 'bottom-right', label: t('siteModules.settings.positionBottomRight') },
          { value: 'bottom-left', label: t('siteModules.settings.positionBottomLeft') },
          { value: 'top-right', label: t('siteModules.settings.positionTopRight') },
          { value: 'top-left', label: t('siteModules.settings.positionTopLeft') },
        ],
      },
      { key: 'enableTextScale', label: t('siteModules.settings.enableTextScale'), type: 'toggle' },
      { key: 'enableContrast', label: t('siteModules.settings.enableContrast'), type: 'toggle' },
      { key: 'enableFocus', label: t('siteModules.settings.enableFocus'), type: 'toggle' },
      { key: 'enableHighlightLinks', label: t('siteModules.settings.enableHighlightLinks'), type: 'toggle' },
    ],
  },
  payments: {
    title: t('siteModules.settings.paymentsTitle'),
    description: t('siteModules.settings.paymentsDescription'),
    fields: [
      {
        key: 'mode',
        label: t('siteModules.settings.paymentsMode'),
        type: 'select',
        options: [
          { value: 'test', label: t('siteModules.settings.paymentsModeTest') },
          { value: 'live', label: t('siteModules.settings.paymentsModeLive') },
        ],
      },
      { key: 'publicKey', label: t('siteModules.settings.paymentsPublicKey'), type: 'text' },
      { key: 'webhookSecret', label: t('siteModules.settings.paymentsWebhookSecret'), type: 'text' },
    ],
  },
  'forms-pro': {
    title: t('siteModules.settings.formsTitle'),
    description: t('siteModules.settings.formsDescription'),
    fields: [
      { key: 'allowUploads', label: t('siteModules.settings.allowUploads'), type: 'toggle' },
      { key: 'maxFileSizeMb', label: t('siteModules.settings.maxFileSize'), type: 'number', placeholder: '20' },
      { key: 'requireConsent', label: t('siteModules.settings.requireConsent'), type: 'toggle' },
    ],
  },
  analytics: {
    title: t('siteModules.settings.analyticsTitle'),
    description: t('siteModules.settings.analyticsDescription'),
    fields: [
      { key: 'measurementId', label: t('siteModules.settings.analyticsMeasurementId'), type: 'text' },
      { key: 'anonymizeIp', label: t('siteModules.settings.analyticsAnonymize'), type: 'toggle' },
    ],
  },
  'meta-pixel': {
    title: t('siteModules.settings.pixelTitle'),
    description: t('siteModules.settings.pixelDescription'),
    fields: [
      { key: 'pixelId', label: t('siteModules.settings.pixelId'), type: 'text' },
    ],
  },
  'tag-manager': {
    title: t('siteModules.settings.gtmTitle'),
    description: t('siteModules.settings.gtmDescription'),
    fields: [
      { key: 'containerId', label: t('siteModules.settings.gtmContainerId'), type: 'text' },
    ],
  },
  'embeds-media': {
    title: t('siteModules.settings.embedsTitle'),
    description: t('siteModules.settings.embedsDescription'),
    fields: [
      { key: 'allowlistDomains', label: t('siteModules.settings.embedsAllowlist'), type: 'textarea' },
    ],
  },
  maps: {
    title: t('siteModules.settings.mapsTitle'),
    description: t('siteModules.settings.mapsDescription'),
    fields: [
      {
        key: 'provider',
        label: t('siteModules.settings.mapsProvider'),
        type: 'select',
        options: [
          { value: 'osm', label: 'OpenStreetMap' },
          { value: 'google', label: 'Google Maps' },
        ],
      },
      { key: 'apiKey', label: t('siteModules.settings.mapsApiKey'), type: 'text' },
      { key: 'defaultZoom', label: t('siteModules.settings.mapsDefaultZoom'), type: 'number', placeholder: '12' },
    ],
  },
  'blog-content': {
    title: t('siteModules.settings.blogTitle'),
    description: t('siteModules.settings.blogDescription'),
    fields: [
      { key: 'postsPerPage', label: t('siteModules.settings.blogPostsPerPage'), type: 'number', placeholder: '10' },
      { key: 'showCategories', label: t('siteModules.settings.blogShowCategories'), type: 'toggle' },
    ],
  },
};

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title={t('siteModules.title')}
          description={t('siteModules.description')}
        />

        {planLabel && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="default">{t('siteModules.planLabel')}: {planLabel}</Badge>
            {site ? <Badge tone="default">{t('siteModules.siteLabel')}: {site.site.slug}</Badge> : null}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent>
              <div className="py-6 text-sm text-muted">{t('siteModules.loading')}</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {BUILDER_MODULES.map((module) => {
              const enabled = isEnabled(module.key);
              const inPlan = isInPlan(module.key);
              const locked = !inPlan && !enabled;
              const deps = module.dependencies ?? [];

              return (
                <Card key={module.key} className="border border-gray-200">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-md bg-gray-100 p-2 text-gray-600">
                          {module.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{module.title}</CardTitle>
                          <p className="text-sm text-muted mt-1">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {locked ? <Badge tone="warning">{t('siteModules.requiresPlan')}</Badge> : null}
                        {enabled ? <Badge tone="success">{t('siteModules.enabled')}</Badge> : <Badge tone="default">{t('siteModules.disabled')}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deps.length > 0 && (
                      <div className="text-xs text-muted">
                        {t('siteModules.requires')}: <strong>{deps.map(getModuleDisplayTitle).join(', ')}</strong>
                      </div>
                    )}

                    {module.plan && (
                      <div className="text-xs text-muted">
                        {t('siteModules.planTier')}: <strong>{module.plan.toUpperCase()}</strong>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={enabled ? 'outline' : 'primary'}
                        size="sm"
                        disabled={locked}
                        onClick={() => handleToggle(module.key, !enabled)}
                      >
                        {enabled ? t('siteModules.disable') : locked ? t('siteModules.locked') : t('siteModules.enable')}
                      </Button>
                      {locked && (
                        <span className="text-xs text-muted">
                          {t('siteModules.upgradeHint')}
                        </span>
                      )}
                    </div>

                    {MODULE_SETTINGS[module.key] && inPlan && (
                      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {MODULE_SETTINGS[module.key].title}
                            </div>
                            <div className="text-xs text-muted mt-1">
                              {MODULE_SETTINGS[module.key].description}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateModuleConfig(module.key, draftConfig[module.key] || {})}
                          >
                            {t('siteModules.settings.save')}
                          </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3">
                          {MODULE_SETTINGS[module.key].fields.map((field) => {
                            const rawValue = (draftConfig[module.key] || {})[field.key];
                            const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
                            const numberValue = typeof rawValue === 'number' ? rawValue : rawValue ? Number(rawValue) : '';
                            if (field.type === 'toggle') {
                              return (
                                <label key={field.key} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                                  <span>{field.label}</span>
                                  <input
                                    type="checkbox"
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

                            if (field.type === 'textarea') {
                              return (
                                <label key={field.key} className="text-xs text-muted">
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{field.label}</span>
                                  <textarea
                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
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

                            if (field.type === 'select') {
                              return (
                                <label key={field.key} className="text-xs text-muted">
                                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{field.label}</span>
                                  <select
                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                    value={value || field.options?.[0]?.value || ''}
                                    onChange={(e) => {
                                      const next = { ...(draftConfig[module.key] || {}) };
                                      next[field.key] = e.target.value;
                                      setDraftConfig({ ...draftConfig, [module.key]: next });
                                    }}
                                  >
                                    {field.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </label>
                              );
                            }

                            return (
                              <label key={field.key} className="text-xs text-muted">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{field.label}</span>
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                  placeholder={field.placeholder}
                                  value={field.type === 'number' ? numberValue : value}
                                  onChange={(e) => {
                                    const next = { ...(draftConfig[module.key] || {}) };
                                    next[field.key] = field.type === 'number' ? Number(e.target.value) : e.target.value;
                                    setDraftConfig({ ...draftConfig, [module.key]: next });
                                  }}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}
