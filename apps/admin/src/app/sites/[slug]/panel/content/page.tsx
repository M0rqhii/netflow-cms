"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyContentRedirect() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      router.replace(`/sites/${encodeURIComponent(slug)}/panel/pages`);
    }
  }, [router, slug]);

  return null;
}
