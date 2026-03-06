"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@repo/ui";
import {
  confirmPasswordReset,
  getPasswordActionTokenStatus,
  requestPasswordReset,
} from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

type TokenPurpose = "reset_password" | "account_setup";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted">Loading...</div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenPurpose, setTokenPurpose] = useState<TokenPurpose | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verifyToken = async () => {
      if (!token) return;
      try {
        setLoadingToken(true);
        setTokenError(null);
        const status = await getPasswordActionTokenStatus(token);
        if (!cancelled) {
          setTokenPurpose(status.purpose);
        }
      } catch (e) {
        if (!cancelled) {
          setTokenError(e instanceof Error ? e.message : t("auth.resetTokenInvalid"));
        }
      } finally {
        if (!cancelled) {
          setLoadingToken(false);
        }
      }
    };

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const onRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setRequesting(true);
      await requestPasswordReset(email.trim().toLowerCase(), orgId.trim() || undefined);
      setRequestSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.resetRequestError"));
    } finally {
      setRequesting(false);
    }
  };

  const onSubmitNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.resetPasswordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.resetPasswordMismatch"));
      return;
    }

    try {
      setSubmitting(true);
      await confirmPasswordReset(token, password);
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.resetConfirmError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="card card-pad">
          {!token ? (
            <>
              <div className="view-title">{t("auth.resetRequestTitle")}</div>
              <div className="detail-label mt-1.5">{t("auth.resetRequestSubtitle")}</div>

              {requestSent ? (
                <div className="mt-5 rounded-[12px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] px-3 py-3 text-sm text-[#22c55e]">
                  {t("auth.resetRequestSent")}
                </div>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onRequestReset}>
                  <Input
                    label={t("auth.email")}
                    type="email"
                    value={email}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                    required
                    placeholder="name@company.com"
                  />
                  <Input
                    label={t("auth.optionalOrgId")}
                    value={orgId}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOrgId(event.target.value)}
                    placeholder={t("auth.optionalOrgIdPlaceholder")}
                    helperText={t("auth.optionalOrgIdHint")}
                  />
                  {error && (
                    <div className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[#ef4444]">
                      {error}
                    </div>
                  )}
                  <button className="btn btn-primary w-full" type="submit" disabled={requesting}>
                    {requesting ? t("auth.sendingResetRequest") : t("auth.sendResetRequest")}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="view-title">
                {tokenPurpose === "account_setup" ? t("auth.accountSetupTitle") : t("auth.resetConfirmTitle")}
              </div>
              <div className="detail-label mt-1.5">
                {tokenPurpose === "account_setup" ? t("auth.accountSetupSubtitle") : t("auth.resetConfirmSubtitle")}
              </div>

              {loadingToken && <div className="mt-5 text-sm text-muted">{t("common.loading")}</div>}

              {!loadingToken && tokenError && (
                <div className="mt-5 rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[#ef4444]">
                  {tokenError}
                </div>
              )}

              {!loadingToken && !tokenError && completed && (
                <div className="mt-5 rounded-[12px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] px-3 py-3 text-sm text-[#22c55e]">
                  {tokenPurpose === "account_setup"
                    ? t("auth.accountSetupComplete")
                    : t("auth.resetConfirmSuccess")}
                </div>
              )}

              {!loadingToken && !tokenError && !completed && (
                <form className="mt-5 space-y-3" onSubmit={onSubmitNewPassword}>
                  <Input
                    label={t("auth.newPassword")}
                    type="password"
                    value={password}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                  <Input
                    label={t("auth.confirmPassword")}
                    type="password"
                    value={confirmPassword}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                  {error && (
                    <div className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-sm text-[#ef4444]">
                      {error}
                    </div>
                  )}
                  <button className="btn btn-primary w-full" type="submit" disabled={submitting}>
                    {submitting ? t("auth.savingPassword") : t("auth.saveNewPassword")}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-5 text-center text-sm">
            <Link href="/login" className="text-primary hover:opacity-80 transition-opacity">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
