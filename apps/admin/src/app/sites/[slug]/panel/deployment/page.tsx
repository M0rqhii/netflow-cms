"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DeploymentAliasPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      router.replace(`/sites/${encodeURIComponent(slug)}/panel/deployments`);
    }
  }, [slug, router]);

  return null;
}
