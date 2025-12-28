"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { EmptyState } from '@repo/ui';

export default function CollectionsPage() {
  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Collections"
          description="Collections allow you to model structured data (e.g., blog posts, news, events). Coming soon."
          action={{
            label: 'New collection',
            disabled: true,
          }}
        />

        <Card>
          <CardContent>
            <EmptyState
              title="No collections yet"
              description="Define collections to structure your site data. This will unlock with the Design workspace rollout."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                  <rect x="4" y="5" width="16" height="4" rx="1.5" />
                  <rect x="4" y="11" width="8" height="8" rx="1.5" />
                  <rect x="14" y="11" width="6" height="8" rx="1.5" />
                </svg>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Examples</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-muted">
              Blog posts, authors, categories
            </div>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-muted">
              Landing pages, hero banners, testimonials
            </div>
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
