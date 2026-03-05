import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsMenu from '@/components/layout/NotificationsMenu';

const pushMock = jest.fn();

const fetchOrgDashboardMock = jest.fn();
const fetchActivityMock = jest.fn();
const decodeAuthTokenMock = jest.fn();
const getAuthTokenMock = jest.fn();
const getProfileMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'shell.notifications': 'Notifications',
      'shell.markAllRead': 'Mark all read',
      'shell.loadingNotifications': 'Loading notifications...',
      'shell.noNotifications': 'No notifications',
    };
    return map[key] || key;
  },
}));

jest.mock('@/lib/formatters', () => ({
  timeAgo: () => 'just now',
}));

jest.mock('@/lib/api', () => ({
  fetchOrgDashboard: (...args: unknown[]) => fetchOrgDashboardMock(...args),
  fetchActivity: (...args: unknown[]) => fetchActivityMock(...args),
  decodeAuthToken: (...args: unknown[]) => decodeAuthTokenMock(...args),
  getAuthToken: () => getAuthTokenMock(),
  getProfile: (...args: unknown[]) => getProfileMock(...args),
}));

describe('NotificationsMenu', () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockReset();
    fetchOrgDashboardMock.mockReset();
    fetchActivityMock.mockReset();
    decodeAuthTokenMock.mockReset();
    getAuthTokenMock.mockReset();
    getProfileMock.mockReset();

    getAuthTokenMock.mockReturnValue('token');
    decodeAuthTokenMock.mockReturnValue({
      sub: 'user-1',
      orgId: 'org-1',
      email: 'owner@example.com',
      role: 'owner',
      platformRole: 'org_owner',
    });
  });

  it('loads dashboard alerts and marks all as read', async () => {
    fetchOrgDashboardMock.mockResolvedValue({
      alerts: [
        {
          id: 'a1',
          type: 'deployment_error',
          severity: 'high',
          message: 'Deployment failed',
          actionUrl: '/sites/alpha/panel/deployments',
        },
      ],
    });

    render(<NotificationsMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    await waitFor(() => {
      expect(screen.getByText('Deployment issue')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

    const stored = window.localStorage.getItem('nfcms.notifications.read.v1:user-1');
    expect(stored).toContain('alert:a1');
  });

  it('falls back to activity when alerts are unavailable', async () => {
    fetchOrgDashboardMock.mockRejectedValue(new Error('fail')); 
    fetchActivityMock.mockResolvedValue([
      {
        id: 'log-1',
        type: 'content_update',
        message: 'Entry updated',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationsMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    await waitFor(() => {
      expect(screen.getByText('Entry updated')).toBeInTheDocument();
    });
  });
});
