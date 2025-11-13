"use client";

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/api';

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
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(decodeEmail(getAuthToken()));
  }, []);

  const logout = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keys.push(k);
        }
        keys.forEach((k) => {
          if (k === 'authToken' || k.startsWith('tenantToken:')) localStorage.removeItem(k);
        });
      }
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {email && <span className="text-sm text-muted">{email}</span>}
      <button className="btn btn-outline" onClick={logout}>Logout</button>
    </div>
  );
}

