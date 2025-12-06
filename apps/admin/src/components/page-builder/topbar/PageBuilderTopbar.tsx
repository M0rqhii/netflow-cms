"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import BreadcrumbsComponent from '@/components/ui/Breadcrumbs';

interface PageBuilderTopbarProps {
  pageName?: string;
  environment?: 'draft' | 'production';
}

export function PageBuilderTopbar({ 
  pageName = 'Untitled Page',
  environment = 'draft' 
}: PageBuilderTopbarProps) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const breadcrumbs = [
    { label: 'Sites', href: '/sites' },
    { label: slug || 'Site', href: `/sites/${encodeURIComponent(slug)}` },
    { label: 'Panel', href: `/sites/${encodeURIComponent(slug)}/panel` },
    { label: 'Page Builder' },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <BreadcrumbsComponent items={breadcrumbs} />
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-xl font-semibold">{pageName}</h1>
            <Badge tone={environment === 'production' ? 'success' : 'warning'}>
              {environment === 'production' ? 'Production' : 'Draft'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Placeholder for future actions (save, publish, etc.) */}
        </div>
      </div>
    </div>
  );
}

