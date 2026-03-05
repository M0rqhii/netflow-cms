'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { decodeAuthToken, getAuthToken, logout } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';

type UserInfo = {
  email: string;
  role: string;
  platformRole: string;
  isSuperAdmin: boolean;
};

function toInitials(email: string): string {
  const [localPart] = email.split('@');
  const chunks = localPart
    .split(/[._-]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length === 0) return '?';
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0].charAt(0)}${chunks[1].charAt(0)}`.toUpperCase();
}

function prettifyRole(role: string): string {
  if (!role) return 'Member';
  return role
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function UserBar() {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const payload = decodeAuthToken(getAuthToken());
    const email = String(payload?.email ?? '').trim();
    if (!email) return;

    setUser({
      email,
      role: String(payload?.role ?? ''),
      platformRole: String(payload?.platformRole ?? ''),
      isSuperAdmin: Boolean(payload?.isSuperAdmin) || String(payload?.systemRole ?? '').toLowerCase() === 'super_admin',
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const email = user?.email ?? '';
  const initials = toInitials(email);

  const roleLabel = useMemo(
    () => prettifyRole(user?.platformRole || user?.role || ''),
    [user?.platformRole, user?.role]
  );

  const canViewBilling = useMemo(() => {
    if (!user) return false;
    const role = `${user.role} ${user.platformRole}`.toLowerCase();
    return user.isSuperAdmin || role.includes('owner');
  }, [user]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="user-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('shell.openUserMenu')}
      >
        <div className="user-meta">
          <div className="name">{email || 'User'}</div>
          <div className="plan">{roleLabel}</div>
        </div>
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
      </button>

      {open && (
        <div className="user-menu" role="menu">
          <div className="user-menu-header">
            <div className="font-semibold text-sm truncate">{email || 'User'}</div>
            <div className="text-xs text-muted">{t('shell.role')}: {roleLabel}</div>
          </div>
          <div className="user-menu-body">
            <Link href="/account" className="user-menu-item" onClick={() => setOpen(false)} role="menuitem">
              {t('shell.account')}
            </Link>
            {canViewBilling && (
              <Link href="/billing" className="user-menu-item" onClick={() => setOpen(false)} role="menuitem">
                {t('shell.billing')}
              </Link>
            )}
            <button
              type="button"
              className="user-menu-item"
              onClick={() => logout('/login')}
              role="menuitem"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
