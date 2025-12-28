"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { MediaManager } from '@/components/media-manager/MediaManager';

export default function MediaPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Media Library"
          description="Upload and manage media assets used across pages, collections, and SEO."
          action={undefined}
        />

        <MediaManager siteSlug={slug} />
      </div>
    </SitePanelLayout>
  );
}




