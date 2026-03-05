"use client";

import { useState, useEffect, useCallback } from "react";
import { Input, Skeleton } from "@repo/ui";
import {
  getCurrentUser,
  updateAccountPreferences,
  changePassword,
  getBillingInfo,
  updateBillingInfo,
  getAccountSecurity,
  updateAccountSecurity,
  regenerateAccountRecoveryCodes,
  type AccountSecuritySettings,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/hooks/useTranslations";

function formatSecurityDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AccountPage() {
  const t = useTranslations();
  const { push: pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);

  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"pl" | "en">("en");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [nip, setNip] = useState("");
  const [address, setAddress] = useState("");

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"auth_app" | "email">("auth_app");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [securityUpdatedAt, setSecurityUpdatedAt] = useState<string | null>(null);

  const applySecuritySettings = useCallback((security: AccountSecuritySettings) => {
    setTwoFactorEnabled(security.twoFactorEnabled);
    setTwoFactorMethod(security.twoFactorMethod);
    setLoginAlerts(security.loginAlerts);
    setSessionTimeoutMinutes(security.sessionTimeoutMinutes);
    setRecoveryCodes(Array.isArray(security.recoveryCodes) ? security.recoveryCodes : []);
    setSecurityUpdatedAt(security.updatedAt ?? null);
  }, []);

  const loadAccountData = useCallback(async () => {
    try {
      setLoading(true);
      const [accountData, billingData, securityData] = await Promise.all([
        getCurrentUser(),
        getBillingInfo(),
        getAccountSecurity().catch(() => null),
      ]);

      setEmail(accountData.email || "");
      setPreferredLanguage((accountData.preferredLanguage as "pl" | "en") || "en");
      setCompanyName(billingData.companyName || "");
      setNip(billingData.nip || "");
      setAddress(billingData.address || "");

      if (securityData) {
        applySecuritySettings(securityData);
      } else if (accountData.security) {
        setTwoFactorEnabled(Boolean(accountData.security.twoFactorEnabled));
        setTwoFactorMethod(accountData.security.twoFactorMethod || "auth_app");
        setLoginAlerts(accountData.security.loginAlerts !== false);
        setSessionTimeoutMinutes(accountData.security.sessionTimeoutMinutes || 30);
        setSecurityUpdatedAt(accountData.security.updatedAt || null);
      }
    } catch (error) {
      pushToast({
        message: t("account.failedToLoadAccountData"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [applySecuritySettings, pushToast, t]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAccountSaving(true);
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
      setAccountSaving(false);
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
      setPasswordSaving(true);
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
      setPasswordSaving(false);
    }
  };

  const handleUpdateBillingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBillingSaving(true);
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
      setBillingSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSecuritySaving(true);
      const next = await updateAccountSecurity({
        twoFactorEnabled,
        twoFactorMethod,
        loginAlerts,
        sessionTimeoutMinutes,
      });
      applySecuritySettings(next);
      pushToast({
        message: "Security settings saved",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : "Failed to save security settings",
        tone: "error",
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    try {
      setSecuritySaving(true);
      const next = await updateAccountSecurity({
        twoFactorEnabled: !twoFactorEnabled,
        twoFactorMethod,
        loginAlerts,
        sessionTimeoutMinutes,
      });
      applySecuritySettings(next);
      pushToast({
        message: next.twoFactorEnabled ? "2FA enabled" : "2FA disabled",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : "Failed to change 2FA status",
        tone: "error",
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      setSecuritySaving(true);
      const result = await regenerateAccountRecoveryCodes();
      setRecoveryCodes(result.recoveryCodes || []);
      setSecurityUpdatedAt(result.generatedAt || new Date().toISOString());
      pushToast({
        message: "Recovery codes regenerated",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        message: error instanceof Error ? error.message : "Failed to regenerate recovery codes",
        tone: "error",
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="account-page-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
        <div className="account-page-shell">
          <div className="card card-pad">
            <Skeleton variant="text" width={220} height={30} />
            <div className="spacer-sm" />
            <Skeleton variant="text" width={340} height={18} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="card card-pad">
              <Skeleton variant="rectangular" width="100%" height={220} />
            </div>
            <div className="card card-pad">
              <Skeleton variant="rectangular" width="100%" height={220} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page-frame w-full px-3 sm:px-5 lg:px-6 2xl:px-8 py-4 sm:py-6">
      <div className="account-page-shell">
        <div className="card card-pad">
          <div className="row-start flex-wrap">
            <div>
              <div className="view-title">{t("account.title")}</div>
              <div className="view-sub">Compact account center: profile, password, billing and account security.</div>
            </div>
            <div className="row-wrap">
              <span className="badge gray">{email}</span>
              <span className={twoFactorEnabled ? "badge green" : "badge gray"}>
                {twoFactorEnabled ? "2FA enabled" : "2FA disabled"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="card card-pad">
            <div className="section-title">{t("account.accountSettings")}</div>
            <div className="spacer-sm" />
            <form onSubmit={handleUpdateAccount} className="grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    disabled={accountSaving}
                  >
                    <option value="en">{t("account.english")}</option>
                    <option value="pl">{t("account.polish")}</option>
                  </select>
                  <p className="text-xs text-muted mt-1">{t("account.selectPreferredLanguage")}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="btn btn-primary" type="submit" disabled={accountSaving}>
                  {accountSaving ? t("account.saving") : t("account.saveChanges")}
                </button>
              </div>
            </form>
          </div>

          <div className="card card-pad">
            <div className="row-between flex-wrap">
              <div className="section-title">Security and 2FA</div>
              <span className={twoFactorEnabled ? "badge green" : "badge gray"}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="detail-label mt-1.5">
              Additional account protection, login alerts and recovery options.
            </div>
            <div className="spacer-sm" />

            <form onSubmit={handleSaveSecurity} className="grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                    2FA method
                  </label>
                  <select
                    className="input"
                    value={twoFactorMethod}
                    onChange={(e) => setTwoFactorMethod(e.target.value as "auth_app" | "email")}
                    disabled={securitySaving}
                  >
                    <option value="auth_app">Authenticator app</option>
                    <option value="email">Email code</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                    Session timeout
                  </label>
                  <select
                    className="input"
                    value={sessionTimeoutMinutes}
                    onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                    disabled={securitySaving}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
              </div>

              <label className="row-wrap" style={{ justifyContent: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={loginAlerts}
                  disabled={securitySaving}
                  onChange={(e) => setLoginAlerts(e.target.checked)}
                />
                <span className="text-sm">Send login alerts on new device sign-ins</span>
              </label>

              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <div className="detail-label">
                  Last update: {formatSecurityDate(securityUpdatedAt)}
                </div>
                <div className="row-wrap">
                  <button className="btn" type="button" onClick={handleToggleTwoFactor} disabled={securitySaving}>
                    {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={securitySaving}>
                    {securitySaving ? "Saving..." : "Save security"}
                  </button>
                </div>
              </div>
            </form>

            {twoFactorEnabled && recoveryCodes.length > 0 && (
              <>
                <div className="spacer-sm" />
                <div className="card tab-bar">
                  <div className="row-between flex-wrap">
                    <div className="detail-label">Recovery codes (store them safely)</div>
                    <button className="btn" type="button" onClick={handleRegenerateCodes} disabled={securitySaving}>
                      Regenerate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {recoveryCodes.map((code) => (
                      <code key={code} className="block text-xs bg-surface-2 px-2.5 py-2 rounded text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card card-pad">
            <div className="section-title">{t("account.changePassword")}</div>
            <div className="spacer-sm" />
            <form onSubmit={handleChangePassword} className="grid gap-3">
              <Input
                label={t("account.currentPassword")}
                type="password"
                value={oldPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                required
                disabled={passwordSaving}
                helperText={t("account.enterCurrentPassword")}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label={t("account.newPassword")}
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  helperText={t("account.passwordMinLengthHelper")}
                  disabled={passwordSaving}
                />
                <Input
                  label={t("account.confirmNewPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  helperText={t("account.reEnterNewPassword")}
                  disabled={passwordSaving}
                />
              </div>
              <div className="flex justify-end">
                <button className="btn btn-primary" type="submit" disabled={passwordSaving}>
                  {passwordSaving ? t("account.changing") : t("account.changePasswordButton")}
                </button>
              </div>
            </form>
          </div>

          <div className="card card-pad xl:col-span-2">
            <div className="section-title">{t("account.billingInfo")}</div>
            <div className="spacer-sm" />
            <form onSubmit={handleUpdateBillingInfo} className="grid gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input
                  label={t("account.companyName")}
                  value={companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                  placeholder={t("account.enterCompanyName")}
                  disabled={billingSaving}
                />
                <Input
                  label={t("account.nip")}
                  value={nip}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNip(e.target.value)}
                  placeholder={t("account.enterNip")}
                  disabled={billingSaving}
                  helperText={t("account.nipHelperText")}
                />
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                    {t("account.address")}
                  </label>
                  <textarea
                    className="input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("account.enterBillingAddress")}
                    rows={3}
                    disabled={billingSaving}
                  />
                  <p className="text-xs text-muted mt-1">{t("account.enterCompanyBillingAddress")}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="btn btn-primary" type="submit" disabled={billingSaving}>
                  {billingSaving ? t("account.savingBilling") : t("account.saveBillingInfo")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
