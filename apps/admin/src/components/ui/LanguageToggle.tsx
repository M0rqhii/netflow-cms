'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useTranslations } from '@/hooks/useTranslations';

function LanguageFlag({ language }: { language: string }) {
  if (language === 'pl') {
    return (
      <svg
        aria-hidden
        viewBox="0 0 20 14"
        className="h-3.5 w-5 rounded-sm border border-black/10"
      >
        <rect width="20" height="14" fill="#FFFFFF" />
        <rect y="7" width="20" height="7" fill="#DC143C" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 20 14"
      className="h-3.5 w-5 rounded-sm border border-black/10"
    >
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#C8102E" strokeWidth="2" />
      <path d="M10 0V14M0 7H20" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M10 0V14M0 7H20" stroke="#C8102E" strokeWidth="3.5" />
    </svg>
  );
}

export default function LanguageToggle() {
  const t = useTranslations();
  const { language, changeLanguage, loading } = useLanguage();

  if (loading) {
    return (
      <button className="btn btn-outline" disabled>
        <span className="w-5 h-5">...</span>
      </button>
    );
  }

  const isPolish = language === 'pl';
  const nextLanguage = isPolish ? 'en' : 'pl';
  const nextLabel = isPolish ? t('language.selectEnglish') : t('language.selectPolish');

  return (
    <button
      onClick={() => changeLanguage(nextLanguage)}
      className="btn btn-outline"
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        <LanguageFlag language={language} />
        <span>{language.toUpperCase()}</span>
      </span>
    </button>
  );
}
