'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useTranslations } from '@/hooks/useTranslations';

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
  const currentLabel = isPolish
    ? `\u{1F1F5}\u{1F1F1} PL`
    : `\u{1F1EC}\u{1F1E7} EN`;

  return (
    <button
      onClick={() => changeLanguage(nextLanguage)}
      className="btn btn-outline"
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="text-sm font-medium">{currentLabel}</span>
    </button>
  );
}
