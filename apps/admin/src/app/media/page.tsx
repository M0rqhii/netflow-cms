"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";

export default function MediaRedirectPage() {
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    router.replace("/sites");
  }, [router]);

  return (
    <div className="card card-pad" style={{ textAlign: "center" }}>
      <div className="text-muted">{t("sites.sitePanelComingSoon")}</div>
      <div className="detail-label" style={{ marginTop: 6 }}>{t("redirects.mediaManagedInSitePanel")}</div>
    </div>
  );
}
