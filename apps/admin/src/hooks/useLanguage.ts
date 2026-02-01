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
  const syncInProgressRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedLangRef = useRef<Language | null>(null);

  // Sync language to API function with debouncing and request deduplication
  const syncLanguageToAPI = useCallback(async (lang: Language) => {
    // Skip if already syncing this language
    if (syncInProgressRef.current || lastSyncedLangRef.current === lang) {
      return;
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce the API call
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        // Prevent concurrent requests
        if (syncInProgressRef.current) return;
        syncInProgressRef.current = true;

        await apiRef.current.patch('/users/me/preferences', {
          preferredLanguage: lang,
        }, token);

        lastSyncedLangRef.current = lang;
      } catch (error) {
        // Silent fail - localStorage is the source of truth
        // Error is non-critical, no need to log or show to user
      } finally {
        syncInProgressRef.current = false;
      }
    }, 500); // 500ms debounce
  }, []);

  // Initialize language from localStorage or API (runs once on mount)
  useEffect(() => {
    let isMounted = true;
    
    const initializeLanguage = async () => {
      try {
        // First try localStorage
        const savedLang = localStorage.getItem(LANGUAGE_KEY) as Language | null;
        if (savedLang && (savedLang === 'pl' || savedLang === 'en')) {
          if (!isMounted) return;
          setLanguage(savedLang);
          setLoading(false);
          lastSyncedLangRef.current = savedLang; // Mark as synced to prevent duplicate requests
          return;
        }

        // If no localStorage, try to get from API
        const token = getAuthToken();
        if (token) {
          try {
            const profile = await apiRef.current.get<{ preferredLanguage?: Language }>('/auth/me', token);
            const userLang = profile.preferredLanguage;
            if (userLang && (userLang === 'pl' || userLang === 'en')) {
              if (!isMounted) return;
              setLanguage(userLang);
              localStorage.setItem(LANGUAGE_KEY, userLang);
              lastSyncedLangRef.current = userLang; // Mark as synced
              setLoading(false);
              return;
            }
          } catch (error) {
            // If API fails, use default
          }
        }

        // Default to browser language or 'en'
        if (!isMounted) return;
        const browserLang = navigator.language.split('-')[0];
        const defaultLang: Language = browserLang === 'pl' ? 'pl' : 'en';
        setLanguage(defaultLang);
        localStorage.setItem(LANGUAGE_KEY, defaultLang);
        lastSyncedLangRef.current = defaultLang; // Mark as synced
      } catch (error) {
        // Fallback to default
        if (!isMounted) return;
        setLanguage('en');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const changeLanguage = useCallback(async (newLang: Language) => {
    // Clear any pending sync before changing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setLanguage(newLang);
    localStorage.setItem(LANGUAGE_KEY, newLang);
    
    // Sync to API in background (will be debounced)
    const token = getAuthToken();
    if (token) {
      syncLanguageToAPI(newLang).catch(() => {
        // Silent fail
      });
    }

    // Reload page to apply language changes (next-intl needs full reload)
    // Small delay to allow API sync to start
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [syncLanguageToAPI]);

  // Cleanup on unmount
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

