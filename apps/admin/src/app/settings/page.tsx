"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /settings to /account
 * Settings page has been renamed to Account page in Platform Panel
 * This route is deprecated - use /account instead
 */
export default function SettingsRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/account');
  }, [router]);

  return null;
}
