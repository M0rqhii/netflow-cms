"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';

interface BlockCategory {
  id: string;
  label: string;
  blocks: BlockItem[];
}

interface BlockItem {
  id: string;
  type: string;
  label: string;
  icon?: string;
}

const blockCategories: BlockCategory[] = [
  {
    id: 'layout',
    label: 'Layout',
    blocks: [
      { id: 'section', type: 'section', label: 'Section' },
      { id: 'container', type: 'container', label: 'Container' },
    ],
  },
  {
    id: 'typography',
    label: 'Typography',
    blocks: [
      { id: 'text', type: 'text', label: 'Text' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    blocks: [
      { id: 'image', type: 'image', label: 'Image' },
    ],
  },
  {
    id: 'components',
    label: 'Components',
    blocks: [
      { id: 'button', type: 'button', label: 'Button' },
    ],
  },
];

export function BlockBrowser() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-muted mb-4">Blocks</h2>
        <div className="space-y-4">
          {blockCategories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {category.blocks.map((block) => (
                  <div
                    key={block.id}
                    className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-medium">{block.label}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

