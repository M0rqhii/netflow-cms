"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { SitePanelLayout } from "@/components/site-panel/SitePanelLayout";
import { useTranslations } from "@/hooks/useTranslations";
import { Button } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { fetchMySites, getSeoSettings, updateSeoSettings, type UpdateSeoSettingsDto } from "@/lib/api";
import type { SiteInfo } from "@repo/sdk";

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoOgTitle, setSeoOgTitle] = useState("");
  const [seoOgDescription, setSeoOgDescription] = useState("");
  const [seoOgImage, setSeoOgImage] = useState("");
  const [seoTwitterCard, setSeoTwitterCard] = useState("summary_large_image");

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const foundSite = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!foundSite) {
        throw new Error(t("sitePanelShell.settingsUi.toasts.siteNotFound", { slug }));
      }

      const id = foundSite.siteId;
      setSiteId(id);
      setSite(foundSite);

      const seo = await getSeoSettings(id);
      setSeoTitle(seo.title || "");
      setSeoDescription(seo.description || "");
      setSeoOgTitle(seo.ogTitle || "");
      setSeoOgDescription(seo.ogDescription || "");
      setSeoOgImage(seo.ogImage || "");
      setSeoTwitterCard(seo.twitterCard || "summary_large_image");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.settingsUi.toasts.loadError");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [slug, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSeoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;

    try {
      setSaving(true);

      const payload: UpdateSeoSettingsDto = {
        title: seoTitle || null,
        description: seoDescription || null,
        ogTitle: seoOgTitle || null,
        ogDescription: seoOgDescription || null,
        ogImage: seoOgImage || null,
        twitterCard: seoTwitterCard || null,
      };

      await updateSeoSettings(siteId, payload);

      toast.push({ tone: "success", message: t("sitePanelShell.settingsUi.toasts.seoSaved") });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("sitePanelShell.settingsUi.toasts.seoSaveError");
      toast.push({ tone: "error", message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="card card-pad text-muted">{t("common.loading")}</div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout
      slug={slug}
      activeTab="settings"
      title={t("sitePanelShell.settings.title", { site: site?.site?.name || slug })}
      subtitle={t("sitePanelShell.settings.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.settingsUi.toasts.testConfigMock") })}>{t("sitePanelShell.actions.testConfig")}</button>
          <button className="btn btn-primary" type="button" onClick={() => toast.push({ tone: "success", message: t("sitePanelShell.settingsUi.toasts.saveMock") })}>{t("sitePanelShell.actions.saveChanges")}</button>
        </>
      }
    >
      <div>

        <div className="grid cols-2 items-start">
          <div className="card card-pad">
            <div className="section-title">{t("sitePanelShell.settingsUi.sections.general")}</div>
            <div className="spacer-sm" />

            <div className="form-grid">
              <label className="field-group">
                <div className="detail-label font-black">{t("sitePanelShell.settingsUi.labels.projectName")}</div>
                <input className="input" value={site?.site?.name || ""} readOnly />
              </label>

              <label className="field-group">
                <div className="detail-label font-black">{t("sitePanelShell.settingsUi.labels.primaryDomain")}</div>
                <input className="input" value={site?.site?.slug || ""} readOnly />
              </label>

              <div className="grid cols-2 form-grid">
                <label className="field-group">
                  <div className="detail-label font-black">Locale</div>
                  <input className="input" value="pl-PL" readOnly />
                </label>
                <label className="field-group">
                  <div className="detail-label font-black">Timezone</div>
                  <input className="input" value="Europe/Warsaw" readOnly />
                </label>
              </div>

              <div className="row-wrap mt-2">
                <label className="badge gray row gap-sm">
                  <input type="checkbox" id="site-maint" />
                  {t("sitePanelShell.settingsUi.labels.maintenanceMode")}
                </label>
                <label className="badge gray row gap-sm">
                  <input type="checkbox" id="site-index" defaultChecked />
                  {t("sitePanelShell.settingsUi.labels.allowIndexing")}
                </label>
                <label className="badge gray row gap-sm">
                  <input type="checkbox" id="site-cdn" defaultChecked />
                  {t("sitePanelShell.settingsUi.labels.cdnEnabled")}
                </label>
              </div>
            </div>

            <div className="spacer" />
            <div className="detail-label">
              {t("sitePanelShell.settingsUi.labels.generalHint")}
            </div>
          </div>

          <div className="form-grid">
            <div className="card card-pad">
              <div className="section-title">{t("sitePanelShell.settingsUi.sections.domains")}</div>
              <div className="spacer-sm" />
              <div className="row-wrap">
                <span className="badge green">{t("sitePanelShell.settingsUi.labels.dnsVerified")}</span>
                <span className="badge green">{t("sitePanelShell.settingsUi.labels.sslActive")}</span>
                <span className="badge blue">{t("sitePanelShell.settingsUi.labels.cnameOk")}</span>
                <span className="badge gray">{t("sitePanelShell.settingsUi.labels.hstsOn")}</span>
              </div>
              <div className="spacer-sm" />
              <div className="detail-label">
                {t("sitePanelShell.settingsUi.labels.domainsHint")}
              </div>
            </div>

            <div className="card card-pad">
              <div className="section-title">{t("sitePanelShell.settingsUi.sections.integrations")}</div>
              <div className="spacer-sm" />
              <div className="row-wrap">
                <span className="badge gray">Google Search Console</span>
                <span className="badge gray">GA4</span>
                <span className="badge gray">Sentry</span>
              </div>
              <div className="spacer-sm" />
              <div className="detail-label">
                {t("sitePanelShell.settingsUi.labels.integrationsHint")}
              </div>
            </div>
          </div>
        </div>

        <div className="spacer" />

        <div className="card card-pad">
          <div className="section-title">SEO</div>
          <div className="spacer-sm" />
          <form onSubmit={handleSeoSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Meta title</label>
              <input className="input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Meta description</label>
              <textarea className="input" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid cols-2 form-grid">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">OG title</label>
                <input className="input" value={seoOgTitle} onChange={(e) => setSeoOgTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">OG image</label>
                <input className="input" value={seoOgImage} onChange={(e) => setSeoOgImage(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">OG description</label>
              <textarea className="input" value={seoOgDescription} onChange={(e) => setSeoOgDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Twitter card</label>
              <select className="input" value={seoTwitterCard} onChange={(e) => setSeoTwitterCard(e.target.value)}>
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary large image</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? t("sitePanelShell.settingsUi.actions.saving") : t("sitePanelShell.settingsUi.actions.saveSeo")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SitePanelLayout>
  );
}

