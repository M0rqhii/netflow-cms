'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getAuthToken,
  getAuthTokenExpiry,
  getOnboardingStatus,
  logout,
} from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const fetchPatched = useRef<boolean>(false);
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      logout('/login');
      setIsAuthenticated(false);
      return;
    }

    const expiry = getAuthTokenExpiry(token);
    const timeoutId =
      expiry && expiry > Date.now()
        ? window.setTimeout(() => logout('/login'), expiry - Date.now())
        : window.setTimeout(() => logout('/login'), 0);

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'authToken' && event.newValue === null) {
        logout('/login');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const token = getAuthToken();
      if (!token) {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
        logout('/login');
        return;
      }

      try {
        const onboarding = await getOnboardingStatus();
        if (cancelled) return;

        if (onboarding.required && pathname !== '/onboarding') {
          window.location.replace('/onboarding');
          return;
        }

        if (!onboarding.required && pathname === '/onboarding') {
          window.location.replace('/dashboard');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('missing auth token') || message.includes('unauthorized')) {
          if (!cancelled) {
            setIsAuthenticated(false);
          }
          logout('/login');
          return;
        }

        if (!cancelled) {
          setIsAuthenticated(true);
        }
      }
    };

    setIsAuthenticated(null);
    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || fetchPatched.current) return;
    const originalFetch = window.fetch;
    originalFetchRef.current = originalFetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        logout('/login');
      }
      return response;
    };
    fetchPatched.current = true;

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      fetchPatched.current = false;
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
