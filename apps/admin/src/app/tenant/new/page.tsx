"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /tenant/new to /sites/new
 * This route is deprecated - use /sites/new instead
 */
export default function TenantNewRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/sites/new');
  }, [router]);

  return null;
}
