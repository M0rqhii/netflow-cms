"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

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
    <div className="login-form-panel" style={{ minHeight: '100vh' }}>
      {/* Background */}
      <div className="login-form-bg" aria-hidden="true">
        <div className="login-form-glow" />
        <div className="login-form-glow" style={{ top: 'auto', bottom: '-10%', right: 'auto', left: '-10%', background: 'radial-gradient(circle, rgba(0, 229, 188, 0.05), transparent 65%)' }} />
      </div>

      <div className={`login-form-container transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/Net-Flow-Logo-Horizontal.png"
            alt="Net-Flow"
            width={180}
            height={30}
            className="h-7 w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header" style={{ paddingBottom: 0 }}>
            <div>
              {!token ? (
                <>
                  <h1 className="login-card-title">{t("auth.resetRequestTitle")}</h1>
                  <p className="login-card-desc">{t("auth.resetRequestSubtitle")}</p>
                </>
              ) : (
                <>
                  <h1 className="login-card-title">
                    {tokenPurpose === "account_setup" ? t("auth.accountSetupTitle") : t("auth.resetConfirmTitle")}
                  </h1>
                  <p className="login-card-desc">
                    {tokenPurpose === "account_setup" ? t("auth.accountSetupSubtitle") : t("auth.resetConfirmSubtitle")}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="login-form">
            {!token ? (
              <>
                {requestSent ? (
                  <div className="rounded-[12px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm text-[#22c55e]">
                    {t("auth.resetRequestSent")}
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={onRequestReset}>
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
                      <div className="login-error">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    <button className="login-submit" type="submit" disabled={requesting}>
                      {requesting ? t("auth.sendingResetRequest") : t("auth.sendResetRequest")}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                {loadingToken && <div className="text-sm text-muted">{t("common.loading")}</div>}

                {!loadingToken && tokenError && (
                  <div className="login-error">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{tokenError}</span>
                  </div>
                )}

                {!loadingToken && !tokenError && completed && (
                  <div className="rounded-[12px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm text-[#22c55e]">
                    {tokenPurpose === "account_setup"
                      ? t("auth.accountSetupComplete")
                      : t("auth.resetConfirmSuccess")}
                  </div>
                )}

                {!loadingToken && !tokenError && !completed && (
                  <form className="space-y-4" onSubmit={onSubmitNewPassword}>
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
                      <div className="login-error">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    <button className="login-submit" type="submit" disabled={submitting}>
                      {submitting ? t("auth.savingPassword") : t("auth.saveNewPassword")}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="text-center text-sm pt-1">
              <Link href="/login" className="text-primary hover:opacity-80 transition-opacity">
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-mobile-footer" style={{ display: 'block' }}>
          Net-Flow sp. z o.o.
        </div>
      </div>
    </div>
  );
}
