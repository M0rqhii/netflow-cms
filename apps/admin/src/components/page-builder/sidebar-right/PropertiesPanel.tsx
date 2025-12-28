"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';

interface PropertiesPanelProps {
  selectedBlockId?: string;
}

export function PropertiesPanel({ selectedBlockId }: PropertiesPanelProps) {
  const sections = [
    { id: 'general', label: 'General' },
    { id: 'layout', label: 'Layout' },
    { id: 'typography', label: 'Typography' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-muted mb-4">Properties</h2>
          {selectedBlockId ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted">
                      {section.label} properties will appear here when a block is selected.
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-sm text-muted">
                  <p>No block selected</p>
                  <p className="mt-1">Select a block to edit its properties</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}





