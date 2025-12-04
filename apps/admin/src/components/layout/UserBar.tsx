"use client";

import { useEffect, useState } from 'react';
import { getAuthToken, clearAuthTokens } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';

function decodeEmail(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return payload?.email || null;
  } catch {
    return null;
  }
}

export default function UserBar() {
  const t = useTranslations();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(decodeEmail(getAuthToken()));
  }, []);

  const logout = () => {
    clearAuthTokens();
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center gap-2">
      {email && <span className="text-sm text-muted">{email}</span>}
      <button className="btn btn-outline" onClick={logout}>{t('auth.logout')}</button>
    </div>
  );
}

