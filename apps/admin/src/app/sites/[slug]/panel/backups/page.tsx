"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BackupsAliasPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      router.replace(`/sites/${encodeURIComponent(slug)}/panel/snapshots`);
    }
  }, [slug, router]);

  return null;
}
