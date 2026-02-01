"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { LoadingSpinner } from '@repo/ui';

const MediaManager = dynamic(
  () => import('@/components/media-manager/MediaManager').then(mod => ({ default: mod.MediaManager })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Wczytywanie biblioteki mediów..." />
      </div>
    ),
    ssr: false,
  }
);

export default function MediaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Biblioteka mediów"
          description="Wgrywaj i zarządzaj mediami używanymi w stronach, kolekcjach i SEO."
          action={undefined}
        />

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner text="Wczytywanie biblioteki mediów..." />
          </div>
        }>
          <MediaManager siteSlug={slug} />
        </Suspense>
      </div>
    </SitePanelLayout>
  );
}







