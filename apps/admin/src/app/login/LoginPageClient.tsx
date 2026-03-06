"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createApiClient, type LoginResponse, type LoginTwoFactorRequiredResponse } from '@repo/sdk';
import Link from 'next/link';
import { setAuthToken, getAuthToken, getOnboardingStatus, type AuthSessionUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/ui/LanguageToggle';

function isTwoFactorRequiredResponse(
  response: LoginResponse,
): response is LoginTwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response && response.requiresTwoFactor === true;
}

export default function LoginPage() {
  const api = createApiClient();
  const router = useRouter();
  const t = useTranslations();
  const { language, changeLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'auth_app' | 'email' | null>(null);
  const [twoFactorDelivery, setTwoFactorDelivery] = useState<'email' | 'none' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isTwoFactorStep = Boolean(twoFactorToken);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    let cancelled = false;

    const checkExistingSession = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const onboarding = await getOnboardingStatus();
          if (cancelled) return;
          router.push(onboarding.required ? '/onboarding' : '/dashboard');
          return;
        } catch (error) {
          if (cancelled) return;
          const message = error instanceof Error ? error.message.toLowerCase() : '';
          if (message.includes('unauthorized') || message.includes('missing auth token')) {
            return;
          }
          router.push('/dashboard');
          return;
        }
      }

      const savedLang = localStorage.getItem('nf-language');
      if (!savedLang) {
        setShowLanguageModal(true);
      }
    };

    checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let accessToken = '';
      let user: AuthSessionUser | null = null;

      if (isTwoFactorStep) {
        const token = twoFactorToken;
        const code = twoFactorCode.trim();

        if (!token || !code) {
          setError(t('auth.twoFactorCodeRequired'));
          setLoading(false);
          return;
        }

        const verified = await api.loginWithTwoFactor(token, code);
        accessToken = verified.access_token;
        user = verified.user as AuthSessionUser;
      } else {
        const emailValue = email.trim();
        const passwordValue = password;

        if (!emailValue || !passwordValue) {
          setError(t('auth.invalidCredentials'));
          setLoading(false);
          return;
        }

        const loginResponse = await api.login(undefined, emailValue, passwordValue);
        if (isTwoFactorRequiredResponse(loginResponse)) {
          setTwoFactorToken(loginResponse.twoFactorToken);
          setTwoFactorMethod(loginResponse.twoFactorMethod);
          setTwoFactorDelivery(loginResponse.codeDelivery);
          setTwoFactorCode('');
          setLoading(false);
          return;
        }

        accessToken = loginResponse.access_token;
        user = loginResponse.user as AuthSessionUser;
      }

      setAuthToken(accessToken);
      if (user && !user.preferredLanguage && language) {
        try {
          await api.patch('/users/me/preferences', {
            preferredLanguage: language,
          }, accessToken);
        } catch (err) {
          // Silent fail
        }
      }
      router.push(user?.onboardingRequired ? '/onboarding' : '/dashboard');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('auth.loginFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, twoFactorCode, twoFactorToken, isTwoFactorStep, api, language, router, t]);

  const handleBackToLogin = useCallback(() => {
    setTwoFactorToken(null);
    setTwoFactorCode('');
    setTwoFactorMethod(null);
    setTwoFactorDelivery(null);
    setError(null);
  }, []);

  const handleLanguageSelect = useCallback((lang: 'pl' | 'en') => {
    changeLanguage(lang);
    setShowLanguageModal(false);
  }, [changeLanguage]);

  return (
    <div className="login-page">
      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-modal-title"
          aria-describedby="language-modal-description"
        >
          <div className="card p-6 sm:p-8 max-w-sm w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h2 id="language-modal-title" className="text-lg font-semibold text-foreground">
                {t('language.selectLanguage')}
              </h2>
              <p id="language-modal-description" className="text-sm text-muted mt-1.5">
                {t('language.choosePreferredLanguage')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleLanguageSelect('pl')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                aria-label={t('language.selectPolish')}
              >
                <span className="text-2xl" aria-hidden="true">&#x1F1F5;&#x1F1F1;</span>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t('account.polish')}</span>
              </button>
              <button
                onClick={() => handleLanguageSelect('en')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                aria-label={t('language.selectEnglish')}
              >
                <span className="text-2xl" aria-hidden="true">&#x1F1EC;&#x1F1E7;</span>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t('account.english')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left branding panel — visible on lg+ */}
      <div className="login-brand-panel" aria-hidden="true">
        {/* Decorative background */}
        <div className="login-brand-bg">
          <div className="login-brand-gradient-1" />
          <div className="login-brand-gradient-2" />
          <div className="login-brand-grid" />
        </div>

        {/* Floating orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        {/* Brand content */}
        <div className="login-brand-content">
          <Image
            src="/assets/Net-Flow-Logo-Symbol.png"
            alt=""
            width={80}
            height={80}
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">Net-Flow</h1>
          <p className="login-brand-subtitle">
            Enterprise Content Management
          </p>

          {/* Feature pills */}
          <div className="login-brand-features">
            <div className="login-feature-pill">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Multi-Site</span>
            </div>
            <div className="login-feature-pill">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>RBAC</span>
            </div>
            <div className="login-feature-pill">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Headless API</span>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="login-brand-footer">
          Net-Flow sp. z o.o.
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        {/* Subtle background for form side */}
        <div className="login-form-bg" aria-hidden="true">
          <div className="login-form-glow" />
        </div>

        <div className={`login-form-container transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Mobile-only logo */}
          <div className="login-mobile-logo">
            <Image
              src="/assets/Net-Flow-Logo-Horizontal.png"
              alt="Net-Flow"
              width={180}
              height={30}
              className="h-7 w-auto"
              priority
            />
          </div>

          {/* Form card */}
          <div className="login-card">
            <div className="login-card-header">
              <div>
                <h1 className="login-card-title">
                  {isTwoFactorStep ? t('auth.twoFactorTitle') : t('auth.loginTitle')}
                </h1>
                <p className="login-card-desc">
                  {isTwoFactorStep ? t('auth.twoFactorSubtitle') : t('auth.loginSubtitle')}
                </p>
                {isTwoFactorStep && (
                  <p className="text-xs text-muted mt-2">
                    {twoFactorDelivery === 'email'
                      ? t('auth.twoFactorHintEmail')
                      : t('auth.twoFactorHintRecovery')}
                  </p>
                )}
              </div>
              <LanguageToggle />
            </div>

            <form onSubmit={onSubmit} className="login-form" noValidate>
              {!isTwoFactorStep && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="login-label">
                      {t('auth.email')}
                    </label>
                    <div className="relative">
                      <div className="login-input-icon">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        className="login-input login-input-with-icon"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        aria-required="true"
                        aria-invalid={error ? 'true' : undefined}
                        aria-describedby={error ? 'login-error' : undefined}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="login-label">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                      <div className="login-input-icon">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        className="login-input login-input-with-icon pr-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        aria-required="true"
                        aria-invalid={error ? 'true' : undefined}
                        aria-describedby={error ? 'login-error' : undefined}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end -mt-1">
                    <Link href="/reset-password" className="text-xs text-primary hover:opacity-80 transition-opacity">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                </>
              )}

              {isTwoFactorStep && (
                <div className="space-y-1.5">
                  <label htmlFor="login-2fa-code" className="login-label">
                    {t('auth.twoFactorCode')}
                  </label>
                  <input
                    id="login-2fa-code"
                    type="text"
                    className="login-input px-4"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder={t('auth.twoFactorCodePlaceholder')}
                    required
                    aria-required="true"
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                    autoComplete="one-time-code"
                  />
                  <p className="text-xs text-muted">
                    {twoFactorMethod === 'email'
                      ? t('auth.twoFactorMethodEmail')
                      : t('auth.twoFactorMethodAuthApp')}
                  </p>
                </div>
              )}

              {error && (
                <div
                  id="login-error"
                  className="login-error animate-fade-in"
                  role="alert"
                  aria-live="polite"
                >
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {isTwoFactorStep ? t('auth.verifyingTwoFactor') : t('auth.loggingIn')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {isTwoFactorStep ? t('auth.verifyAndLogin') : t('auth.login')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>

              {isTwoFactorStep && (
                <button
                  type="button"
                  className="btn w-full h-11 text-sm font-medium rounded-xl"
                  onClick={handleBackToLogin}
                  disabled={loading}
                >
                  {t('auth.backToLogin')}
                </button>
              )}

              <p className="text-xs text-muted text-center pt-1">
                {isTwoFactorStep ? t('auth.twoFactorStepNote') : t('auth.loginNote')}
              </p>
            </form>
          </div>

          {/* Mobile footer */}
          <div className="login-mobile-footer">
            Net-Flow sp. z o.o.
          </div>
        </div>
      </div>
    </div>
  );
}
