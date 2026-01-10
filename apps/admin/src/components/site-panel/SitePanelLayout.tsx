"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { SitePanelNav } from './SitePanelNav';
import { trackOnboardingSuccess } from '@/lib/onboarding';

interface SitePanelLayoutProps {
  children: React.ReactNode;
}

export function SitePanelLayout({ children }: SitePanelLayoutProps) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  useEffect(() => {
    trackOnboardingSuccess('site_panel');
  }, []);

  return (
    <div className="container py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link 
            href={`/sites/${encodeURIComponent(slug)}`} 
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Back to Site
          </Link>
          <Badge className="font-mono text-xs">{slug}</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Site Workspace</h1>
          <p className="text-sm text-muted">
            All site-level operations in one place: overview, pages, content, media, marketing, deployments, and settings.
          </p>
        </div>
      </div>

      <SitePanelNav slug={slug} />

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}









