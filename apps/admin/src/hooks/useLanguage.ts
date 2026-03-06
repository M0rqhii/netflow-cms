'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';

const LANGUAGE_KEY = 'nf-language';
const LANGUAGE_EVENT = 'nf-language-change';

type Language = 'pl' | 'en';

function isLanguage(value: string | null | undefined): value is Language {
  return value === 'pl' || value === 'en';
}

function applyDocumentLanguage(language: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const apiRef = useRef(createApiClient());
  const syncInProgressRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedLangRef = useRef<Language | null>(null);

  const syncLanguageToAPI = useCallback(async (lang: Language) => {
    if (syncInProgressRef.current || lastSyncedLangRef.current === lang) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = getAuthToken();
        if (!token || syncInProgressRef.current) return;

        syncInProgressRef.current = true;
        await apiRef.current.patch(
          '/users/me/preferences',
          { preferredLanguage: lang },
          token
        );
        lastSyncedLangRef.current = lang;
      } catch {
        // Local preference remains source of truth.
      } finally {
        syncInProgressRef.current = false;
      }
    }, 500);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeLanguage = async () => {
      try {
        const savedLang = localStorage.getItem(LANGUAGE_KEY);
        if (isLanguage(savedLang)) {
          if (!isMounted) return;
          setLanguage(savedLang);
          applyDocumentLanguage(savedLang);
          lastSyncedLangRef.current = savedLang;
          return;
        }

        const token = getAuthToken();
        if (token) {
          try {
            const profile = await apiRef.current.get<{ preferredLanguage?: Language }>(
              '/auth/me',
              token
            );
            const userLang = profile.preferredLanguage;
            if (isLanguage(userLang)) {
              if (!isMounted) return;
              setLanguage(userLang);
              applyDocumentLanguage(userLang);
              localStorage.setItem(LANGUAGE_KEY, userLang);
              lastSyncedLangRef.current = userLang;
              return;
            }
          } catch {
            // Fallback to browser language if profile request fails.
          }
        }

        if (!isMounted) return;
        const browserLang = navigator.language.split('-')[0];
        const defaultLang: Language = browserLang === 'pl' ? 'pl' : 'en';
        setLanguage(defaultLang);
        applyDocumentLanguage(defaultLang);
        localStorage.setItem(LANGUAGE_KEY, defaultLang);
        lastSyncedLangRef.current = defaultLang;
      } catch {
        if (!isMounted) return;
        setLanguage('en');
        applyDocumentLanguage('en');
        localStorage.setItem(LANGUAGE_KEY, 'en');
        lastSyncedLangRef.current = 'en';
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleExternalLanguageChange = (nextLang: Language) => {
      setLanguage((prev) => (prev === nextLang ? prev : nextLang));
      applyDocumentLanguage(nextLang);
      localStorage.setItem(LANGUAGE_KEY, nextLang);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_KEY) return;
      if (!isLanguage(event.newValue)) return;
      handleExternalLanguageChange(event.newValue);
    };

    const onLanguageEvent = (event: Event) => {
      const detail = (event as CustomEvent<Language>).detail;
      if (!isLanguage(detail)) return;
      handleExternalLanguageChange(detail);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LANGUAGE_EVENT, onLanguageEvent as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LANGUAGE_EVENT, onLanguageEvent as EventListener);
    };
  }, []);

  const changeLanguage = useCallback(
    async (newLang: Language) => {
      if (!isLanguage(newLang)) return;

      setLanguage((prev) => (prev === newLang ? prev : newLang));
      applyDocumentLanguage(newLang);
      localStorage.setItem(LANGUAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: newLang }));

      const token = getAuthToken();
      if (token) {
        syncLanguageToAPI(newLang).catch(() => {
          // Silent fail to avoid blocking UI.
        });
      }
    },
    [syncLanguageToAPI]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    language,
    changeLanguage,
    loading,
  };
}
