'use client';

import { useLanguage } from '@/hooks/useLanguage';

export default function LanguageToggle() {
  const { language, changeLanguage, loading } = useLanguage();

  if (loading) {
    return (
      <button className="btn btn-outline" disabled>
        <span className="w-5 h-5">...</span>
      </button>
    );
  }

  const toggleLanguage = () => {
    const newLang = language === 'pl' ? 'en' : 'pl';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="btn btn-outline"
      aria-label={language === 'pl' ? 'Switch to English' : 'Przełącz na polski'}
      title={language === 'pl' ? 'English' : 'Polski'}
    >
      <span className="text-sm font-medium">
        {language === 'pl' ? '🇵🇱 PL' : '🇬🇧 EN'}
      </span>
    </button>
  );
}

