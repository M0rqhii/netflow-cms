import type { ActivityItem, DashboardAlert } from '@/lib/api';

export const GLOBAL_SEARCH_KEY = 'nfcms.search';
const NOTIFICATION_READ_PREFIX = 'nfcms.notifications.read.v1:';

export type ShellNotificationSeverity = 'info' | 'warning' | 'error';

export type ShellNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
  severity: ShellNotificationSeverity;
  isRead: boolean;
  isMock: boolean;
};

function normalizeSearchValue(value: unknown): string {
  return String(value ?? '').trim();
}

export function readGlobalSearch(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeSearchValue(window.localStorage.getItem(GLOBAL_SEARCH_KEY));
  } catch {
    return '';
  }
}

export function publishGlobalSearch(query: string): string {
  const normalized = normalizeSearchValue(query);
  if (typeof window === 'undefined') return normalized;

  try {
    window.localStorage.setItem(GLOBAL_SEARCH_KEY, normalized);
  } catch {
    // ignore storage failures
  }

  window.dispatchEvent(new CustomEvent<string>('nfcms:search', { detail: normalized }));
  return normalized;
}

export function subscribeGlobalSearch(onChange: (value: string) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const eventHandler = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string') {
      onChange(normalizeSearchValue(detail));
      return;
    }
    onChange(readGlobalSearch());
  };

  const storageHandler = (event: StorageEvent) => {
    if (event.key !== GLOBAL_SEARCH_KEY) return;
    onChange(normalizeSearchValue(event.newValue));
  };

  window.addEventListener('nfcms:search', eventHandler as EventListener);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('nfcms:search', eventHandler as EventListener);
    window.removeEventListener('storage', storageHandler);
  };
}

function normalizeTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function severityFromAlert(alert: DashboardAlert): ShellNotificationSeverity {
  if (alert.severity === 'high') return 'error';
  if (alert.severity === 'medium') return 'warning';
  return 'info';
}

function titleFromAlertType(type: DashboardAlert['type']): string {
  const labels: Record<DashboardAlert['type'], string> = {
    deployment_error: 'Deployment issue',
    missing_domain: 'Domain requires attention',
    limit_exceeded: 'Limit exceeded',
    policy_disabled: 'Policy disabled',
    billing_issue: 'Billing issue',
  };
  return labels[type] ?? 'Notification';
}

function titleFromActivity(item: ActivityItem): string {
  const source = String(item.type ?? '').trim();
  if (!source) return 'Activity';
  return source
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function severityFromActivity(item: ActivityItem): ShellNotificationSeverity {
  const message = `${item.message} ${item.description ?? ''}`.toLowerCase();
  if (message.includes('error') || message.includes('failed') || message.includes('unauthorized')) {
    return 'error';
  }
  if (message.includes('warn') || message.includes('retry') || message.includes('degraded')) {
    return 'warning';
  }
  return 'info';
}

function hrefFromActivity(_item: ActivityItem): string {
  return '/dashboard';
}

function sortNotifications(items: ShellNotification[]): ShellNotification[] {
  return items.slice().sort((a, b) => normalizeTimestamp(b.time) - normalizeTimestamp(a.time));
}

export function mapDashboardAlertsToShellNotifications(
  alerts: DashboardAlert[],
  readIds: ReadonlySet<string> = new Set<string>()
): ShellNotification[] {
  return sortNotifications(
    alerts.map((alert) => {
      const id = `alert:${alert.id}`;
      return {
        id,
        title: titleFromAlertType(alert.type),
        body: alert.message,
        time: new Date().toISOString(),
        href: alert.actionUrl || '/dashboard',
        severity: severityFromAlert(alert),
        isRead: readIds.has(id),
        isMock: false,
      } satisfies ShellNotification;
    })
  );
}

export function mapActivityToShellNotifications(
  activity: ActivityItem[],
  readIds: ReadonlySet<string> = new Set<string>()
): ShellNotification[] {
  return sortNotifications(
    activity.map((item) => {
      const id = `activity:${item.id}`;
      return {
        id,
        title: titleFromActivity(item),
        body: item.message || item.description || 'Activity update',
        time: item.createdAt,
        href: hrefFromActivity(item),
        severity: severityFromActivity(item),
        isRead: readIds.has(id),
        isMock: false,
      } satisfies ShellNotification;
    })
  );
}

export function createMockShellNotifications(
  readIds: ReadonlySet<string> = new Set<string>()
): ShellNotification[] {
  const now = Date.now();

  const items: ShellNotification[] = [
    {
      id: 'mock:deploy',
      title: 'Deployment completed',
      body: 'Production build published successfully.',
      time: new Date(now - 1000 * 60 * 8).toISOString(),
      href: '/dashboard',
      severity: 'info',
      isRead: readIds.has('mock:deploy'),
      isMock: true,
    },
    {
      id: 'mock:limits',
      title: 'Usage warning',
      body: 'API usage reached 82% of this month limit.',
      time: new Date(now - 1000 * 60 * 34).toISOString(),
      href: '/billing',
      severity: 'warning',
      isRead: readIds.has('mock:limits'),
      isMock: true,
    },
    {
      id: 'mock:security',
      title: 'Security event',
      body: 'A new login was detected on your account.',
      time: new Date(now - 1000 * 60 * 95).toISOString(),
      href: '/account',
      severity: 'info',
      isRead: readIds.has('mock:security'),
      isMock: true,
    },
  ];

  return sortNotifications(items);
}

function readIdsFromStorage(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${NOTIFICATION_READ_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

export function readNotificationReadState(userId: string): Set<string> {
  if (!userId) return new Set<string>();
  return new Set<string>(readIdsFromStorage(userId));
}

export function writeNotificationReadState(userId: string, ids: ReadonlySet<string>): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(`${NOTIFICATION_READ_PREFIX}${userId}`, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage failures
  }
}

export function markNotificationIdsRead(userId: string, ids: string[]): Set<string> {
  const next = readNotificationReadState(userId);
  for (const id of ids) {
    if (id) next.add(id);
  }
  writeNotificationReadState(userId, next);
  return next;
}

export function applyReadState(
  notifications: ShellNotification[],
  readIds: ReadonlySet<string>
): ShellNotification[] {
  return notifications.map((item) => ({ ...item, isRead: readIds.has(item.id) }));
}
