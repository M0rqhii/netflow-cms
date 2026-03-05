import {
  applyReadState,
  mapActivityToShellNotifications,
  mapDashboardAlertsToShellNotifications,
  markNotificationIdsRead,
  publishGlobalSearch,
  readGlobalSearch,
  readNotificationReadState,
  subscribeGlobalSearch,
  type ShellNotification,
} from '@/lib/shell';

describe('lib/shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('publishes global search and notifies subscribers', () => {
    const onChange = jest.fn();
    const unsubscribe = subscribeGlobalSearch(onChange);

    publishGlobalSearch('project-42');

    expect(readGlobalSearch()).toBe('project-42');
    expect(onChange).toHaveBeenCalledWith('project-42');

    unsubscribe();
  });

  it('maps dashboard alerts to shell notifications', () => {
    const alerts = [
      {
        id: 'a1',
        type: 'deployment_error',
        severity: 'high',
        message: 'Deployment failed',
        actionUrl: '/sites/my-site/panel/deployments',
      },
    ];

    const notifications = mapDashboardAlertsToShellNotifications(alerts, new Set(['alert:a1']));

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id: 'alert:a1',
      severity: 'error',
      isRead: true,
      href: '/sites/my-site/panel/deployments',
    });
  });

  it('maps activity entries to shell notifications', () => {
    const activity = [
      {
        id: 'log1',
        message: 'Page published',
        createdAt: new Date().toISOString(),
      },
    ];

    const notifications = mapActivityToShellNotifications(activity);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id: 'activity:log1',
      title: 'Activity',
    });
  });

  it('stores read notification ids under user key', () => {
    const updated = markNotificationIdsRead('user-1', ['id-1', 'id-2']);

    expect(updated.has('id-1')).toBe(true);
    expect(updated.has('id-2')).toBe(true);

    const fromStorage = readNotificationReadState('user-1');
    expect(fromStorage.has('id-1')).toBe(true);
    expect(fromStorage.has('id-2')).toBe(true);
  });

  it('applies read state to existing notifications', () => {
    const input: ShellNotification[] = [
      {
        id: 'n1',
        title: 'Title',
        body: 'Body',
        time: new Date().toISOString(),
        href: '/dashboard',
        severity: 'info',
        isRead: false,
      },
    ];

    const output = applyReadState(input, new Set(['n1']));
    expect(output[0].isRead).toBe(true);
  });
});
