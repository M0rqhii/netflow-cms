"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";

export default function CollectionsRedirectPage() {
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    router.replace("/sites");
  }, [router]);

  return (
    <div className="card card-pad text-center">
      <div className="text-muted">{t("sites.sitePanelComingSoon")}</div>
      <div className="text-muted text-xs mt-1.5">{t("redirects.collectionsManagedInSitePanel")}</div>
    </div>
  );
}
