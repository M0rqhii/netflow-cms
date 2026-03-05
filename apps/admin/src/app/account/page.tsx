"use client";

import { useState, useEffect, useCallback } from "react";
import { Input, Skeleton } from "@repo/ui";
import { getCurrentUser, updateAccountPreferences, changePassword, getBillingInfo, updateBillingInfo } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";

export default function AccountPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"pl" | "en">("en");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [nip, setNip] = useState("");
  const [address, setAddress] = useState("");

  const loadAccountData = useCallback(async () => {
    try {
      setLoading(true);
      const [accountData, billingData] = await Promise.all([
        getCurrentUser(),
        getBillingInfo(),
      ]);

      setEmail(accountData.email || "");
      setPreferredLanguage((accountData.preferredLanguage as "pl" | "en") || "en");
      setCompanyName(billingData.companyName || "");
      setNip(billingData.nip || "");
      setAddress(billingData.address || "");
    } catch (error) {
      pushToast({
        message: t("account.failedToLoadAccountData"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast, t]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAccountPreferences({ preferredLanguage });
      pushToast({
        message: t("account.accountPreferencesUpdatedSuccessfully"),
        tone: "success",
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t("account.failedToUpdateAccountPreferences"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      pushToast({
        message: t("account.passwordsDoNotMatch"),
        tone: "error",
      });
      return;
    }
    if (newPassword.length < 8) {
      pushToast({
        message: t("account.passwordMinLength"),
        tone: "error",
      });
      return;
    }
    try {
      setSaving(true);
      await changePassword({ oldPassword, newPassword });
      pushToast({
        message: t("account.passwordChangedSuccessfully"),
        tone: "success",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t("account.failedToChangePassword"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBillingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBillingInfo({ companyName, nip, address });
      pushToast({
        message: t("account.billingInformationUpdatedSuccessfully"),
        tone: "success",
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : t("account.failedToUpdateBillingInformation"),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="space-y-4">
          <Skeleton variant="text" width={200} height={32} />
          <div className="card card-pad">
            <Skeleton variant="rectangular" width="100%" height={200} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card card-pad">
        <div className="view-title">{t("account.title")}</div>
        <div className="view-sub">Manage your account preferences and security.</div>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("account.accountSettings")}</div>
        <div className="spacer-sm" />
        <form onSubmit={handleUpdateAccount} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("account.emailAddress")}
            value={email}
            readOnly
            className="bg-surface-2"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            helperText={t("account.emailCannotBeChanged")}
          />
          <div>
            <label htmlFor="preferred-language" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {t("account.preferredLanguage")}
            </label>
            <select
              id="preferred-language"
              className="input"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as "pl" | "en")}
              disabled={saving}
              aria-describedby="preferred-language-hint"
            >
              <option value="en">{t("account.english")}</option>
              <option value="pl">{t("account.polish")}</option>
            </select>
            <p id="preferred-language-hint" className="text-xs text-muted mt-1">
              {t("account.selectPreferredLanguage")}
            </p>
          </div>
          <div className="flex justify-end">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? t("account.saving") : t("account.saveChanges")}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("account.changePassword")}</div>
        <div className="spacer-sm" />
        <form onSubmit={handleChangePassword} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("account.currentPassword")}
            type="password"
            value={oldPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
            required
            disabled={saving}
            helperText={t("account.enterCurrentPassword")}
          />
          <Input
            label={t("account.newPassword")}
            type="password"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            required
            minLength={8}
            helperText={t("account.passwordMinLengthHelper")}
            disabled={saving}
          />
          <Input
            label={t("account.confirmNewPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            helperText={t("account.reEnterNewPassword")}
            disabled={saving}
          />
          <div className="flex justify-end">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? t("account.changing") : t("account.changePasswordButton")}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="card card-pad">
        <div className="section-title">{t("account.billingInfo")}</div>
        <div className="spacer-sm" />
        <form onSubmit={handleUpdateBillingInfo} className="space-y-3" style={{ maxWidth: 520 }}>
          <Input
            label={t("account.companyName")}
            value={companyName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
            placeholder={t("account.enterCompanyName")}
            disabled={saving}
          />
          <Input
            label={t("account.nip")}
            value={nip}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNip(e.target.value)}
            placeholder={t("account.enterNip")}
            disabled={saving}
            helperText={t("account.nipHelperText")}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {t("account.address")}
            </label>
            <textarea
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("account.enterBillingAddress")}
              rows={3}
              disabled={saving}
            />
            <p className="text-xs text-muted mt-1">{t("account.enterCompanyBillingAddress")}</p>
          </div>
          <div className="flex justify-end">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? t("account.savingBilling") : t("account.saveBillingInfo")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
