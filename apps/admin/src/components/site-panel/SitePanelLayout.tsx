
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { SitePanelNav } from './SitePanelNav';
import { trackOnboardingSuccess } from '@/lib/onboarding';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMySites } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';
import { useSiteFeatures } from '@/lib/site-features';

interface SitePanelLayoutProps {
  children: React.ReactNode;
}

export function SitePanelLayout({ children }: SitePanelLayoutProps) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const t = useTranslations();

  const [siteId, setSiteId] = useState<string | null>(null);

  const { features } = useSiteFeatures(siteId);

  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const sites = await fetchMySites();
      const current = sites.find((s: SiteInfo) => s.site.slug === slug) || null;
      if (current) {
        setSiteId(current.siteId);
      }
    } catch {
      setSiteId(null);
    }
  }, [slug]);

  useEffect(() => {
    trackOnboardingSuccess('site_panel');
  }, []);

  useEffect(() => {
    loadSite();
  }, [loadSite]);

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link 
            href={`/sites/${encodeURIComponent(slug)}`} 
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {t('sitePanelLayout.backToSite')}
          </Link>
          <Badge className="font-mono text-xs">{slug}</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('sitePanelLayout.title')}</h1>
          <p className="text-sm text-muted">
            {t('sitePanelLayout.description')}
          </p>
        </div>
      </div>

      <SitePanelNav slug={slug} enabledFeatures={features?.effective ?? null} />

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
