'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLanguage } from '@/hooks/useLanguage';
import { useEffect, useState, useMemo } from 'react';
import enMessages from '../../messages/en.json';
import plMessages from '../../messages/pl.json';

// Preload messages to avoid dynamic imports
const messagesMap: Record<string, typeof enMessages> = {
  en: enMessages,
  pl: plMessages,
};

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const { language, loading } = useLanguage();
  const [locale, setLocale] = useState<string>('en');

  // Update locale when language changes
  useEffect(() => {
    if (!loading && language) {
      setLocale(language);
    }
  }, [language, loading]);

  // Use memoized messages based on locale
  const messages = useMemo(() => {
    return messagesMap[locale] || messagesMap.en;
  }, [locale]);

  // Always provide the provider with messages
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

