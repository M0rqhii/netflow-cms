"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Input } from "@repo/ui";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getAuthToken } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { formatPlanTierLabel } from "@/lib/plans";

type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export default function OrgGeneralSettingsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as string;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error(t("orgGeneral.missingAuthToken"));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-ID": orgId,
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || t("orgGeneral.failedToLoadOrganization"));
      }

      const data = await res.json();
      setOrganization(data);
      setName(data.name || "");
      setSlug(data.slug || "");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("orgGeneral.failedToLoadOrganization");
      toast.push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  }, [orgId, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name) return;

    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error(t("orgGeneral.missingAuthToken"));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Org-ID": orgId,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || t("orgGeneral.failedToSaveOrganizationSettings"));
      }

      toast.push({ tone: "success", message: t("orgGeneral.organizationSettingsSaved") });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("orgGeneral.failedToSaveOrganizationSettings");
      toast.push({ tone: "error", message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("orgGeneral.loadingOrganizationSettings")}</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="card card-pad">
        <div className="text-muted">{t("orgGeneral.organizationNotFound")}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in org-settings-page">
      <div className="card card-pad">
        <div className="section-title">{t("orgGeneral.generalSettings")}</div>
        <div className="detail-label mt-1.5">
          {t("orgGeneral.manageOrganizationNameSlugAndPlan")}
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <form onSubmit={handleSave} className="space-y-3 max-w-[520px]">
          <Input
            label={t("orgGeneral.organizationName")}
            placeholder={t("orgGeneral.organizationNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helperText={t("orgGeneral.organizationNameHelperText")}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgGeneral.slug")}</label>
            <Input
              value={slug}
              onChange={(e) => {
                const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
                setSlug(newSlug);
              }}
              pattern="[a-z0-9-]+"
              helperText={t("orgGeneral.slugHelperText")}
              disabled
            />
            <p className="text-xs text-muted mt-1">{t("orgGeneral.slugCannotBeChangedAfterCreation")}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgGeneral.organizationId")}</label>
            <code className="block text-xs bg-surface-2 px-3 py-3 rounded">{organization.id}</code>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">{t("orgGeneral.plan")}</label>
            <div className="flex items-center gap-2">
              <Badge tone="default">{formatPlanTierLabel(organization.plan)}</Badge>
              <span className="text-xs text-muted">{t("orgGeneral.planChangesAreHandledInBilling")}</span>
            </div>
          </div>

          <div className="row-wrap">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t("orgGeneral.saving") : t("orgGeneral.saveChanges")}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("orgGeneral.dangerZone")}</div>
        <div className="spacer-sm" />
        <div className="card error-alert">
          <div className="text-error font-extrabold">{t("orgGeneral.deleteOrganization")}</div>
          <div className="text-error text-xs mt-1.5">
            {t("orgGeneral.thisActionIsIrreversible")}
          </div>
          <div className="spacer-sm" />
          <button className="btn" type="button" disabled>{t("orgGeneral.deleteOrganization")}</button>
        </div>
      </div>
    </div>
  );
}
