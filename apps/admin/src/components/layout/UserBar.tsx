"use client";

import { useEffect, useState } from 'react';
import { decodeAuthToken, getAuthToken, logout } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';

export default function UserBar() {
  const t = useTranslations();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const payload = decodeAuthToken(getAuthToken());
    setEmail((payload?.email as string) || null);
  }, []);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {email && <span className="hidden sm:inline text-xs sm:text-sm text-muted truncate max-w-[100px] lg:max-w-none">{email}</span>}
      <button className="btn btn-outline text-xs sm:text-sm px-2 sm:px-3" onClick={() => logout('/login')}>{t('auth.logout')}</button>
    </div>
  );
}
