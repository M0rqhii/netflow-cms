'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

// Wrapper around next-intl's useTranslations
// The language is managed by IntlProvider which provides the context
export function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace);
  return t;
}

