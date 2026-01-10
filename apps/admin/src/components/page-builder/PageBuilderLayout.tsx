"use client";

import React from 'react';
import { PageBuilderTopbar } from './topbar/PageBuilderTopbar';
import { BlockBrowser } from './sidebar-left/BlockBrowser';
import { PropertiesPanel } from './sidebar-right/PropertiesPanel';
import { PageBuilderCanvas } from './canvas/PageBuilderCanvas';

interface PageBuilderLayoutProps {
  pageName?: string;
  environment?: 'draft' | 'production';
  selectedBlockId?: string;
}

export function PageBuilderLayout({
  pageName,
  environment,
  selectedBlockId,
}: PageBuilderLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <PageBuilderTopbar pageName={pageName} environment={environment} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Browser */}
        <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
          <BlockBrowser />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden">
          <PageBuilderCanvas />
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
          <PropertiesPanel selectedBlockId={selectedBlockId} />
        </div>
      </div>
    </div>
  );
}









