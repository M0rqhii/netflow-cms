'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import {
  applyReadState,
  createMockShellNotifications,
  mapActivityToShellNotifications,
  mapDashboardAlertsToShellNotifications,
  markNotificationIdsRead,
  readNotificationReadState,
  type ShellNotification,
} from '@/lib/shell';
import {
  decodeAuthToken,
  fetchActivity,
  fetchOrgDashboard,
  getAuthToken,
  getProfile,
} from '@/lib/api';
import { timeAgo } from '@/lib/formatters';

const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';
const isProduction = appProfile === 'production';

function severityBadgeClass(severity: ShellNotification['severity']): string {
  if (severity === 'error') return 'orange';
  if (severity === 'warning') return 'orange';
  return 'blue';
}

export default function NotificationsMenu() {
  const t = useTranslations();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<ShellNotification[]>([]);
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0),
    [notifications]
  );

  useEffect(() => {
    let cancelled = false;

    const resolveIdentity = async () => {
      const payload = decodeAuthToken(getAuthToken());
      const nextUserId = String(payload?.sub ?? payload?.email ?? 'anonymous');
      let nextOrgId = payload?.orgId ? String(payload.orgId) : null;

      if (!nextOrgId) {
        try {
          const profile = await getProfile();
          nextOrgId = profile?.orgId ?? null;
        } catch {
          nextOrgId = null;
        }
      }

      if (!cancelled) {
        setUserId(nextUserId);
        setOrgId(nextOrgId);
      }
    };

    void resolveIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const readIds = readNotificationReadState(userId);

    let next: ShellNotification[] = [];

    if (orgId) {
      try {
        const dashboard = await fetchOrgDashboard(orgId);
        if (Array.isArray(dashboard.alerts) && dashboard.alerts.length > 0) {
          next = mapDashboardAlertsToShellNotifications(dashboard.alerts, readIds);
        }
      } catch {
        next = [];
      }
    }

    if (next.length === 0 && orgId) {
      try {
        const activity = await fetchActivity(12, orgId);
        if (activity.length > 0) {
          next = mapActivityToShellNotifications(activity, readIds);
        }
      } catch {
        next = [];
      }
    }

    if (next.length === 0 && !isProduction) {
      next = createMockShellNotifications(readIds);
    }

    setNotifications(applyReadState(next, readIds));
    setLoading(false);
  }, [orgId, userId]);

  useEffect(() => {
    if (!userId) return;
    void loadNotifications();
  }, [userId, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAsRead = useCallback(
    (ids: string[]) => {
      if (!userId || ids.length === 0) return;
      const updatedReadIds = markNotificationIdsRead(userId, ids);
      setNotifications((prev) => applyReadState(prev, updatedReadIds));
    },
    [userId]
  );

  const handleMarkAllRead = () => {
    markAsRead(notifications.filter((item) => !item.isRead).map((item) => item.id));
  };

  const handleSelectNotification = (item: ShellNotification) => {
    markAsRead([item.id]);
    setOpen(false);
    router.push(item.href || '/dashboard');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="pill relative"
        aria-label={t('shell.notifications')}
        title={t('shell.notifications')}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            void loadNotifications();
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" strokeLinejoin="round" />
          <path d="M9.5 21a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="notif-dot" aria-hidden="true" />}
      </button>

      {open && (
        <div className="user-menu notifications-menu">
          <div className="user-menu-header">
            <div className="font-black text-sm">{t('shell.notifications')}</div>
            <button
              type="button"
              className="btn btn-ghost text-xs px-2"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              {t('shell.markAllRead')}
            </button>
          </div>

          <div className="user-menu-body">
            {loading ? (
              <div className="text-sm text-muted p-2">{t('shell.loadingNotifications')}</div>
            ) : notifications.length === 0 ? (
              <div className="text-sm text-muted p-2">{t('shell.noNotifications')}</div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="user-menu-item notification-item"
                  onClick={() => handleSelectNotification(item)}
                >
                  <div className="notification-head">
                    <span className={`badge ${severityBadgeClass(item.severity)}`}>{item.severity.toUpperCase()}</span>
                    {!item.isRead && <span className="notif-dot inline" aria-hidden="true" />}
                    {item.isMock && <span className="badge gray">Mock</span>}
                  </div>
                  <div className="font-semibold text-sm text-left mt-1">{item.title}</div>
                  <div className="text-xs text-muted text-left mt-1">{item.body}</div>
                  <div className="text-[11px] text-muted text-left mt-1">{timeAgo(item.time)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
