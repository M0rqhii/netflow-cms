"use client";

import React from 'react';

interface PageBuilderCanvasProps {
  content?: unknown;
  onContentChange?: (content: unknown) => void;
  blocks?: unknown[];
}

export function PageBuilderCanvas({ content, onContentChange, blocks = [] }: PageBuilderCanvasProps) {
  // Render content if it's an object with structure
  const renderContent = () => {
    if (!content || typeof content !== 'object') {
      return (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-700">This is the canvas area</h3>
          <p className="text-sm text-muted">
            Blocks will appear here when you add them from the left sidebar.
          </p>
          <div className="mt-6">
            <div className="inline-block px-4 py-2 bg-gray-100 rounded text-sm text-muted">
              Canvas is empty
            </div>
          </div>
        </div>
      );
    }

    // If content has blocks array, render them
    if (Array.isArray((content as any).blocks)) {
      const contentBlocks = (content as any).blocks;
      if (contentBlocks.length === 0) {
        return (
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-700">This is the canvas area</h3>
            <p className="text-sm text-muted">
              Blocks will appear here when you add them from the left sidebar.
            </p>
            <div className="mt-6">
              <div className="inline-block px-4 py-2 bg-gray-100 rounded text-sm text-muted">
                Canvas is empty
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {contentBlocks.map((block: any, index: number) => (
            <div key={index} className="bg-white rounded-lg border p-4">
              <div className="text-sm font-medium mb-2">{block.type || 'Block'}</div>
              {block.content && (
                <div className="text-muted">{String(block.content)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Default: show content structure
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-700">Page Content</h3>
        <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="min-h-full p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

