"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { MediaManager } from '@/components/media-manager/MediaManager';

export default function MediaPage() {
  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Media Library"
          description="Upload and manage media files for your site."
          action={{
            label: 'Upload files',
            disabled: true,
          }}
        />

        <MediaManager />
      </div>
    </SitePanelLayout>
  );
}
