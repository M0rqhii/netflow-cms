"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createApiClient } from '@repo/sdk';
import { setAuthToken, getAuthToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/ui/LanguageToggle';

export default function LoginPage() {
  const api = createApiClient();
  const router = useRouter();
  const t = useTranslations();
  const { language, changeLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push('/dashboard');
    } else {
      const savedLang = localStorage.getItem('nf-language');
      if (!savedLang) {
        setShowLanguageModal(true);
      }
    }
  }, [router]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError(t('auth.invalidCredentials'));
      setLoading(false);
      return;
    }

    try {
      const emailValue = email.trim();
      const passwordValue = password;

      if (!emailValue || !passwordValue) {
        setError(t('auth.invalidCredentials'));
        setLoading(false);
        return;
      }

      const res = await api.login(undefined, emailValue, passwordValue);
      setAuthToken(res.access_token);

      const user = res.user as { preferredLanguage?: string } | null;
      if (user && !user.preferredLanguage && language) {
        try {
          await api.patch('/users/me/preferences', {
            preferredLanguage: language,
          }, res.access_token);
        } catch (err) {
          // Silent fail
        }
      }

      router.push('/dashboard');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('auth.loginFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, api, language, router, t]);

  const handleLanguageSelect = useCallback((lang: 'pl' | 'en') => {
    changeLanguage(lang);
    setShowLanguageModal(false);
  }, [changeLanguage]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'rgb(var(--background))' }}>
      {/* Background decoration — testowe5 style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[30%] -right-[15%] w-[60%] h-[60%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,163,255,0.12), transparent 65%)' }} />
        <div className="absolute -bottom-[25%] -left-[15%] w-[55%] h-[55%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,229,188,0.1), transparent 65%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,163,255,0.06), transparent 55%)' }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className={`relative z-10 w-full max-w-[420px] px-4 sm:px-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/assets/Net-Flow-Logo-Horizontal.png"
              alt="Net-Flow"
              width={220}
              height={36}
              className="h-8 sm:h-9 w-auto"
              priority
            />
          </div>
          <p className="text-sm text-muted">Admin Panel</p>
        </div>

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
                  <span className="text-2xl" aria-hidden="true">🇵🇱</span>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t('account.polish')}</span>
                </button>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                  aria-label={t('language.selectEnglish')}
                >
                  <span className="text-2xl" aria-hidden="true">🇬🇧</span>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t('account.english')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Card — testowe5 glass card */}
        <div className="card overflow-hidden" style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('auth.loginTitle')}</h1>
                <p className="text-sm text-muted mt-1">{t('auth.loginSubtitle')}</p>
              </div>
              <LanguageToggle />
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-foreground">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    className="input h-11 pl-10 pr-3 text-sm placeholder:text-muted/60"
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
                <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input h-11 pl-10 pr-11 text-sm placeholder:text-muted/60"
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
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  id="login-error"
                  className="flex items-start gap-2.5 text-sm px-4 py-3 animate-fade-in"
                  style={{ background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)' }}
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
                className="btn btn-primary w-full h-11 text-sm font-medium rounded-xl relative overflow-hidden"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('auth.loggingIn')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {t('auth.login')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>

              <p className="text-xs text-muted text-center pt-2">
                {t('auth.loginNote')}
              </p>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted/60">
            Net-Flow CMS &middot; Enterprise Content Management
          </p>
        </div>
      </div>
    </div>
  );
}
