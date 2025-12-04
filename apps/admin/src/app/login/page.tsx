"use client";

import { useState, useEffect } from 'react';
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Global login (no tenantId required)
      const res = await api.login(undefined, email, password);
      setAuthToken(res.access_token);
      
      // Check if user has preferredLanguage set, if not, use current selection
      if (res.user && !res.user.preferredLanguage && language) {
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
  };

  const handleLanguageSelect = (lang: 'pl' | 'en') => {
    changeLanguage(lang);
    setShowLanguageModal(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/assets/Net-Flow-Logo-Horizontal.png" alt="Net-Flow" className="h-8 inline-block" style={{ width: 'auto', height: 'auto' }} />
        </div>
        
        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">
                {language === 'pl' ? 'Wybierz język' : 'Select Language'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {language === 'pl' ? 'Wybierz swój preferowany język' : 'Choose your preferred language'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleLanguageSelect('pl')}
                  className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3"
                >
                  <span>🇵🇱</span>
                  <span>Polski</span>
                </button>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3"
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card shadow-lg">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-semibold mb-2">{t('auth.loginTitle')}</h1>
                <p className="text-sm text-muted mb-6">{t('auth.loginSubtitle')}</p>
              </div>
              <LanguageToggle />
            </div>
            <div className="accent-bar mb-6" />
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  className="border rounded w-full p-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="border rounded w-full p-2 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? t('auth.loggingIn') : t('auth.login')}
              </button>
              <p className="text-xs text-muted text-center mt-4">
                {t('auth.loginNote')}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
