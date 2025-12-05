'use client';

import { useEffect } from 'react';
import { logout } from '@/lib/api';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('unauthorized') || message.includes('401')) {
      logout('/login');
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full space-y-4 p-6">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted break-words">
              {error?.message || 'Unexpected error'}
            </p>
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
              <button className="btn btn-outline" onClick={() => logout('/login')}>Go to login</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
