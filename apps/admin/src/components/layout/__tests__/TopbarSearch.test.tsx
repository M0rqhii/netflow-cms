import { act, fireEvent, render, screen } from '@testing-library/react';
import TopbarSearch from '@/components/layout/TopbarSearch';

const pushMock = jest.fn();
const replaceMock = jest.fn();

let pathnameMock = '/dashboard';
let searchParamsMock = new URLSearchParams();
const subscribers: Array<(value: string) => void> = [];

const publishGlobalSearchMock = jest.fn();
const readGlobalSearchMock = jest.fn(() => '');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => pathnameMock,
  useSearchParams: () => searchParamsMock,
}));

jest.mock('@/hooks/useTranslations', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'shell.searchPlaceholder': 'Search everything',
      'common.search': 'Search',
    };
    return map[key] || key;
  },
}));

jest.mock('@/lib/shell', () => ({
  publishGlobalSearch: (value: string) => publishGlobalSearchMock(value),
  readGlobalSearch: () => readGlobalSearchMock(),
  subscribeGlobalSearch: (callback: (value: string) => void) => {
    subscribers.push(callback);
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  },
}));

describe('TopbarSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pushMock.mockReset();
    replaceMock.mockReset();
    publishGlobalSearchMock.mockReset();
    readGlobalSearchMock.mockReset();
    readGlobalSearchMock.mockReturnValue('');
    pathnameMock = '/dashboard';
    searchParamsMock = new URLSearchParams();
    subscribers.length = 0;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('publishes debounced search value', () => {
    render(<TopbarSearch />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'project-a' } });

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(publishGlobalSearchMock).not.toHaveBeenCalledWith('project-a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(publishGlobalSearchMock).toHaveBeenCalledWith('project-a');
  });

  it('routes to /sites with query on Enter outside sites page', () => {
    render(<TopbarSearch />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith('/sites?q=alpha');
  });

  it('updates current /sites query on Enter', () => {
    pathnameMock = '/sites';
    searchParamsMock = new URLSearchParams('page=2');

    render(<TopbarSearch />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(replaceMock).toHaveBeenCalledWith('/sites?page=2&q=beta');
  });

  it('clears search on Escape', () => {
    render(<TopbarSearch />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'to-clear' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect((input as HTMLInputElement).value).toBe('');
    expect(publishGlobalSearchMock).toHaveBeenCalledWith('');
  });
});
