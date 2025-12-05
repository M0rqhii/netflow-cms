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
    <div className="flex items-center gap-2">
      {email && <span className="text-sm text-muted">{email}</span>}
      <button className="btn btn-outline" onClick={() => logout('/login')}>{t('auth.logout')}</button>
    </div>
  );
}
