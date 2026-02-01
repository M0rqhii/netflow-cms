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

  // Redirect if already logged in
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push('/dashboard');
    } else {
      // Check if user needs to select language (first time)
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
    
    // Validate inputs
    if (!email || !password) {
      setError(t('auth.invalidCredentials'));
      setLoading(false);
      return;
    }
    
    try {
      // Ensure values are not empty
      const emailValue = email.trim();
      const passwordValue = password;
      
      if (!emailValue || !passwordValue) {
        setError(t('auth.invalidCredentials'));
        setLoading(false);
        return;
      }
      
      // Global login (no siteId required)
      const res = await api.login(undefined, emailValue, passwordValue);
      setAuthToken(res.access_token);
      
      // Check if user has preferredLanguage set, if not, use current selection
      const user = res.user as { preferredLanguage?: string } | null;
      if (user && !user.preferredLanguage && language) {
        // User logged in but doesn't have language preference - save it
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
    <div className="min-h-screen flex items-center justify-center bg-base-100 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Image 
            src="/assets/Net-Flow-Logo-Horizontal.png" 
            alt="Net-Flow" 
            width={200}
            height={32}
            className="h-8 w-auto inline-block"
            priority
          />
        </div>
        
        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
            aria-describedby="language-modal-description"
          >
            <div className="bg-base-100 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <h2 id="language-modal-title" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                {t('language.selectLanguage')}
              </h2>
              <p id="language-modal-description" className="text-xs sm:text-sm text-muted mb-4 sm:mb-6">
                {t('language.choosePreferredLanguage')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  onClick={() => handleLanguageSelect('pl')}
                  className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm"
                  aria-label={t('language.selectPolish')}
                >
                  <span aria-hidden="true">🇵🇱</span>
                  <span>{t('account.polish')}</span>
                </button>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm"
                  aria-label={t('language.selectEnglish')}
                >
                  <span aria-hidden="true">🇬🇧</span>
                  <span>{t('account.english')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card shadow-lg">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('auth.loginTitle')}</h1>
                <p className="text-xs sm:text-sm text-muted">{t('auth.loginSubtitle')}</p>
              </div>
              <LanguageToggle />
            </div>
            <div className="accent-bar mb-6" />
            <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-xs sm:text-sm font-medium mb-1">
                  {t('auth.email')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="border rounded w-full px-3 py-2 text-sm h-10 bg-card text-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs sm:text-sm font-medium mb-1">
                  {t('auth.password')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="border rounded w-full px-3 py-2 pr-10 text-sm h-10 bg-card text-foreground"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? 'login-error' : undefined}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div id="login-error" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded" role="alert" aria-live="polite">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary w-full text-xs sm:text-sm" disabled={loading} aria-busy={loading}>
                {loading ? t('auth.loggingIn') : t('auth.login')}
              </button>
              <p className="text-xs sm:text-sm text-muted text-center mt-3 sm:mt-4">
                {t('auth.loginNote')}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
