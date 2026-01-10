"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DesignPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;
    router.replace(`/sites/${slug}/panel/pages`);
  }, [router, slug]);

  return (
    <div className="container py-8 text-center text-muted">
      Redirecting to Pages...
    </div>
  );
}
