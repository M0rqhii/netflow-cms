'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logout } from '@/lib/api';
import { useTranslations } from '@/hooks/useTranslations';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';

type UserInfo = {
  email: string;
  roleLabel: string;
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

export default function UserBar() {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const platformAccess = usePlatformAccess();

  const [open, setOpen] = useState(false);
  const user = useMemo<UserInfo | null>(() => {
    const email = String(platformAccess.payload?.email ?? '').trim();
    if (!email) return null;

    const roleLabel = platformAccess.platformRbacRoles.length > 0
      ? platformAccess.platformRbacRoles.join(', ')
      : 'Member';

    return {
      email,
      roleLabel: roleLabel || 'Member',
    };
  }, [platformAccess.payload?.email, platformAccess.platformRbacRoles]);

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
  const roleLabel = user?.roleLabel ?? 'Member';
  const canViewBilling = platformAccess.canViewBilling;

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
