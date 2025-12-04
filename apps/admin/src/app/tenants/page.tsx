"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /tenants to /sites
 * This route is deprecated - use /sites instead
 */
export default function TenantsRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/sites');
  }, [router]);

  return null;
}
