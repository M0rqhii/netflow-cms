"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@repo/ui";
import { changePassword, completeOnboarding, getOnboardingStatus } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { useLanguage } from "@/hooks/useLanguage";

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations();
  const { language: currentLanguage, changeLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferredLanguage, setPreferredLanguage] = useState<"pl" | "en">("en");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const status = await getOnboardingStatus();
        if (cancelled) return;

        if (!status.required) {
          router.replace("/dashboard");
          return;
        }

        const nextLanguage = status.preferredLanguage || currentLanguage || "en";
        setPreferredLanguage(nextLanguage);
        setFirstName(status.profile.firstName || "");
        setLastName(status.profile.lastName || "");
        setPhone(status.profile.phone || "");
        setMustChangePassword(status.mustChangePassword);
        setPasswordUpdated(!status.mustChangePassword);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("onboarding.loadError"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentLanguage, router, t]);

  const onChangePassword = async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError(t("onboarding.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("onboarding.passwordMismatch"));
      return;
    }

    try {
      setPasswordSaving(true);
      await changePassword({ oldPassword, newPassword });
      setPasswordUpdated(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("onboarding.passwordChangeError"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const onComplete = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mustChangePassword && !passwordUpdated) {
      setError(t("onboarding.finishPasswordFirst"));
      return;
    }

    try {
      setSaving(true);
      await completeOnboarding({
        preferredLanguage,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await changeLanguage(preferredLanguage);
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("onboarding.completeError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="card card-pad">
          <div className="view-title">{t("onboarding.title")}</div>
          <div className="detail-label mt-1.5">{t("onboarding.subtitle")}</div>

          {error && (
            <div className="mt-4 rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-5" onSubmit={onComplete}>
            <div>
              <label htmlFor="onboarding-language" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                {t("onboarding.language")}
              </label>
              <select
                id="onboarding-language"
                className="input"
                value={preferredLanguage}
                onChange={(event) => setPreferredLanguage(event.target.value as "pl" | "en")}
              >
                <option value="pl">{t("account.polish")}</option>
                <option value="en">{t("account.english")}</option>
              </select>
            </div>

            {mustChangePassword && !passwordUpdated && (
              <div className="card tab-bar">
                <div className="section-title">{t("onboarding.securityStep")}</div>
                <div className="detail-label mt-1.5">{t("onboarding.securityStepHint")}</div>
                <div className="mt-3 grid gap-3">
                  <Input
                    label={t("account.currentPassword")}
                    type="password"
                    value={oldPassword}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOldPassword(event.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={t("account.newPassword")}
                      type="password"
                      value={newPassword}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewPassword(event.target.value)}
                      required
                      minLength={8}
                    />
                    <Input
                      label={t("account.confirmNewPassword")}
                      type="password"
                      value={confirmPassword}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button className="btn btn-primary" type="button" onClick={onChangePassword} disabled={passwordSaving}>
                      {passwordSaving ? t("onboarding.saving") : t("onboarding.changePassword")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mustChangePassword && passwordUpdated && (
              <div className="rounded-[12px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] px-3 py-2 text-sm text-[#22c55e]">
                {t("onboarding.passwordUpdated")}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t("onboarding.firstName")}
                value={firstName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFirstName(event.target.value)}
                placeholder={t("onboarding.firstNamePlaceholder")}
              />
              <Input
                label={t("onboarding.lastName")}
                value={lastName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLastName(event.target.value)}
                placeholder={t("onboarding.lastNamePlaceholder")}
              />
            </div>
            <Input
              label={t("onboarding.phone")}
              value={phone}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
              placeholder={t("onboarding.phonePlaceholder")}
              helperText={t("onboarding.phoneOptional")}
            />

            <div className="flex justify-end">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t("onboarding.saving") : t("onboarding.finish")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
