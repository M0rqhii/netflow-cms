"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@repo/ui";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";
import { createSite } from "@/lib/api";
import { trackOnboardingSuccess } from "@/lib/onboarding";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
}

export default function NewSitePage() {
  const t = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoGenerateSlug) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setAutoGenerateSlug(false);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim();
    const normalizedSlug = slugify(slug.trim());

    if (!normalizedName || normalizedName.length < 3) {
      setError(t("newSite.nameMustBeAtLeast3Characters"));
      return;
    }

    if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
      setSlug(normalizedSlug);
      setError(t("newSite.slugMustBeAtLeast3Characters"));
      return;
    }

    setSlug(normalizedSlug);
    setLoading(true);

    try {
      const created = await createSite({ name: normalizedName, slug: normalizedSlug });
      const createdObj = created as { slug?: string; site?: { slug?: string } } | null;
      const redirectSlug = createdObj?.slug || createdObj?.site?.slug || normalizedSlug;

      push({
        tone: "success",
        message: t("newSite.siteCreatedSuccessfully"),
      });
      trackOnboardingSuccess("site_created");

      router.push(redirectSlug ? `/sites/${redirectSlug}` : "/sites");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("newSite.failedToCreateSite");
      setError(message);
      push({ tone: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card card-pad">
        <div className="row-start">
          <div>
            <div className="view-title">{t("newSite.title")}</div>
            <div className="view-sub">Create a new site in the system.</div>
          </div>
          <div className="row-wrap">
            <Link href="/sites" className="btn">{t("common.cancel")}</Link>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="card card-pad" style={{ maxWidth: 720 }}>
        <div className="section-title">{t("newSite.siteInformation")}</div>
        <div className="spacer-sm" />
        <form onSubmit={onSubmit} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("newSite.siteName")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            minLength={3}
            placeholder={t("newSite.siteNamePlaceholder")}
            helperText={t("newSite.siteNameHelperText")}
          />

          <Input
            label={t("sites.slug")}
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            minLength={3}
            pattern="[a-z0-9\-]+"
            placeholder={t("sites.slugPlaceholder")}
            helperText={t("newSite.slugHelperText")}
          />

          <label className="row text-xs text-muted">
            <input
              type="checkbox"
              checked={autoGenerateSlug}
              onChange={(e) => {
                setAutoGenerateSlug(e.target.checked);
                if (e.target.checked) {
                  setSlug(slugify(name));
                }
              }}
            />
            {t("newSite.autoGenerateSlugFromName")}
          </label>

          {error && (
            <div className="error-alert">
              <div className="text-error text-xs">{error}</div>
            </div>
          )}

          <div className="row-wrap" style={{ justifyContent: "flex-start" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t("newSite.creating") : t("newSite.create")}
            </button>
            <Link href="/sites" className="btn">{t("common.cancel")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

