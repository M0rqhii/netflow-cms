"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { SeoForm } from '@/components/site-seo/SeoForm';

export default function SEOPage() {
  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="SEO"
          description="Zarządzaj metadanymi, podglądem social i optymalizacją wyszukiwarki dla tej strony."
        />
        <SeoForm />
      </div>
    </SitePanelLayout>
  );
}
