'use client';

import { useEffect, useRef, useState } from 'react';
import { getAuthToken, getAuthTokenExpiry, logout } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
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

    setIsAuthenticated(true);

    // Auto-logout on token expiry
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
    // Global 401 handler for client-side fetches
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

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

