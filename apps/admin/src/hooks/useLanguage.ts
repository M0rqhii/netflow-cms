'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';

const LANGUAGE_KEY = 'nf-language';

type Language = 'pl' | 'en';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const apiRef = useRef(createApiClient());

  // Sync language to API function - defined before useEffect to avoid closure issues
  const syncLanguageToAPI = useCallback(async (lang: Language) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await apiRef.current.patch('/users/me/preferences', {
        preferredLanguage: lang,
      }, token);
    } catch (error) {
      // Silent fail - localStorage is the source of truth
      // Error is non-critical, no need to log or show to user
    }
  }, []);

  // Initialize language from localStorage or API
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // First try localStorage
        const savedLang = localStorage.getItem(LANGUAGE_KEY) as Language | null;
        if (savedLang && (savedLang === 'pl' || savedLang === 'en')) {
          setLanguage(savedLang);
          setLoading(false);
          
          // Sync with API in background if user is logged in
          const token = getAuthToken();
          if (token) {
            syncLanguageToAPI(savedLang).catch(() => {
              // Silent fail - localStorage is the source of truth
            });
          }
          return;
        }

        // If no localStorage, try to get from API
        const token = getAuthToken();
        if (token) {
          try {
            const profile = await apiRef.current.get('/auth/me', token);
            const userLang = profile.preferredLanguage as Language;
            if (userLang && (userLang === 'pl' || userLang === 'en')) {
              setLanguage(userLang);
              localStorage.setItem(LANGUAGE_KEY, userLang);
              setLoading(false);
              return;
            }
          } catch (error) {
            // If API fails, use default
          }
        }

        // Default to browser language or 'en'
        const browserLang = navigator.language.split('-')[0];
        const defaultLang: Language = browserLang === 'pl' ? 'pl' : 'en';
        setLanguage(defaultLang);
        localStorage.setItem(LANGUAGE_KEY, defaultLang);
      } catch (error) {
        // Fallback to default
        setLanguage('en');
        localStorage.setItem(LANGUAGE_KEY, 'en');
      } finally {
        setLoading(false);
      }
    };

    initializeLanguage();
  }, [syncLanguageToAPI]);

  const changeLanguage = useCallback(async (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem(LANGUAGE_KEY, newLang);
    
    // Sync to API in background
    const token = getAuthToken();
    if (token) {
      syncLanguageToAPI(newLang).catch(() => {
        // Silent fail
      });
    }

    // Reload page to apply language changes (next-intl needs full reload)
    window.location.reload();
  }, [syncLanguageToAPI]);

  return {
    language,
    changeLanguage,
    loading,
  };
}

