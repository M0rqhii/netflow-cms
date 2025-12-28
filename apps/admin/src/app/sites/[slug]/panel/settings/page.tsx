"use client";

import React from 'react';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { EmptyState } from '@repo/ui';

export default function SettingsPage() {
  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Settings"
          description="Site-wide settings such as domains, publishing rules, and integrations will appear here."
        />

        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Settings are not available yet"
              description="We’re preparing domain, redirects, and publishing controls for this site."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                  <path d="M12 8a4 4 0 110 8 4 4 0 010-8z" />
                  <path d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z" />
                </svg>
              }
            />
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
