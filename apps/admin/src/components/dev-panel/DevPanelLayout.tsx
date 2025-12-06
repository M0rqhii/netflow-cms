"use client";

import React from 'react';
import { DevPanelNav } from './DevPanelNav';
import { Badge } from '@/components/ui/Badge';

interface DevPanelLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
}

export function DevPanelLayout({ children, title, description, headerActions }: DevPanelLayoutProps) {
  const appProfile = process.env.NEXT_PUBLIC_APP_PROFILE || process.env.NODE_ENV || 'development';

  return (
    <div className="container py-8">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title || 'Dev Panel'}</h1>
            <p className="text-sm text-muted mt-1">
              {description || 'Internal visibility into dev-only providers and environment'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <Badge tone="warning">Non-production only</Badge>
            <Badge>{appProfile}</Badge>
          </div>
        </div>
        <DevPanelNav />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

