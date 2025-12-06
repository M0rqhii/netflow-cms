"use client";

import React from 'react';
import { PageBuilderLayout } from '@/components/page-builder/PageBuilderLayout';

export default function PageBuilderPage() {
  // Static placeholder data - no real functionality yet
  const pageName = 'Home Page';
  const environment: 'draft' | 'production' = 'draft';
  const selectedBlockId = undefined; // No block selected yet

  return (
    <PageBuilderLayout
      pageName={pageName}
      environment={environment}
      selectedBlockId={selectedBlockId}
    />
  );
}

