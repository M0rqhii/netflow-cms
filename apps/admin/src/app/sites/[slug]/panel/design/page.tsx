"use client";

import React from 'react';
import { PageBuilderLayout } from '@/components/page-builder/PageBuilderLayout';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DesignPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title={
            <div className="flex items-center gap-2">
              Design Workspace
              <span
                className="text-sm text-muted cursor-help"
                title="Design workspace is a general page builder interface. Use Pages tab to edit specific pages. Both use the same builder engine."
              >
                ℹ️
              </span>
            </div>
          }
          description={
            <div>
              <p className="mb-2">General page builder workspace for designing and prototyping.</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> This is a design workspace. To edit specific pages, go to the <Link href={`/sites/${slug}/panel/pages`} className="underline">Pages</Link> tab. Both use the same page builder engine.
              </div>
            </div>
          }
        />
        <Card>
          <CardContent className="pt-6">
            <PageBuilderLayout
              pageName="Design workspace"
              environment="draft"
              selectedBlockId={undefined}
            />
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
