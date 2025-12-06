"use client";

import React from 'react';

interface PageBuilderCanvasProps {
  blocks?: unknown[];
}

export function PageBuilderCanvas({ blocks = [] }: PageBuilderCanvasProps) {
  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="min-h-full p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-700">This is the canvas area</h3>
              <p className="text-sm text-muted">
                Blocks will appear here when you add them from the left sidebar.
              </p>
              {blocks.length === 0 && (
                <div className="mt-6">
                  <div className="inline-block px-4 py-2 bg-gray-100 rounded text-sm text-muted">
                    Canvas is empty
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

