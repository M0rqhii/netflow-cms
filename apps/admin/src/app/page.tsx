'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only redirect after component is mounted (client-side)
    if (typeof window !== 'undefined') {
      const token = getAuthToken();
      if (token) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  // Show loading state during SSR and initial mount
  if (!mounted) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="text-center">
        <p className="text-muted">Redirecting...</p>
      </div>
    </div>
  );
}

